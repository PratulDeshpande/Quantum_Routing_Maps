import sqlite3
import datetime
import os
import psycopg2

DB_PATH = os.path.join(os.path.dirname(__file__), "quotas.db")
DATABASE_URL = os.environ.get("DATABASE_URL")

def get_db_connection():
    if DATABASE_URL:
        return psycopg2.connect(DATABASE_URL)
    else:
        # For sqlite3, isolation_level="EXCLUSIVE" is used during the actual context, 
        # but here we just return the connection object.
        return sqlite3.connect(DB_PATH)

def init_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if DATABASE_URL:
            # PostgreSQL syntax
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS global_usage (
                    month_year VARCHAR(10) PRIMARY KEY,
                    count INTEGER
                )
            ''')
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS ip_usage (
                    ip VARCHAR(50) PRIMARY KEY,
                    last_reset TIMESTAMP,
                    count INTEGER
                )
            ''')
        else:
            # SQLite syntax
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS global_usage (
                    month_year TEXT PRIMARY KEY,
                    count INTEGER
                )
            ''')
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS ip_usage (
                    ip TEXT PRIMARY KEY,
                    last_reset TIMESTAMP,
                    count INTEGER
                )
            ''')
        conn.commit()
    except Exception as e:
        print(f"DB Init Error: {e}")
    finally:
        if 'conn' in locals() and conn:
            conn.close()

def check_and_consume_quota(ip_address, max_global=50, max_ip_daily=2):
    """
    Checks if the IP or Global quota is exceeded.
    If not, it increments the usage counters and returns True.
    If exceeded, it returns False.
    Uses SQLite EXCLUSIVE transactions for thread-safety.
    """
    now = datetime.datetime.now()
    month_year = now.strftime("%m-%Y")
    
    try:
        conn = get_db_connection()
        
        # In postgres, we can use row-level locking or just a transaction.
        # psycopg2 opens a transaction by default on first execute.
        if not DATABASE_URL:
            # Re-apply isolation for sqlite3
            conn.isolation_level = "EXCLUSIVE"
            
        cursor = conn.cursor()
        
        param_placeholder = "%s" if DATABASE_URL else "?"
        
        # --- Global Quota Check ---
        cursor.execute(f"SELECT count FROM global_usage WHERE month_year = {param_placeholder}", (month_year,))
        row = cursor.fetchone()
        if row is None:
            global_count = 0
            cursor.execute(f"INSERT INTO global_usage (month_year, count) VALUES ({param_placeholder}, {param_placeholder})", (month_year, 0))
        else:
            global_count = row[0]
            
        if global_count >= max_global:
            conn.rollback()
            conn.close()
            return False, "Global API quota reached (50 jobs/month)."
            
        # --- IP Quota Check ---
        cursor.execute(f"SELECT last_reset, count FROM ip_usage WHERE ip = {param_placeholder}", (ip_address,))
        row = cursor.fetchone()
        if row is None:
            ip_count = 0
            cursor.execute(f"INSERT INTO ip_usage (ip, last_reset, count) VALUES ({param_placeholder}, {param_placeholder}, {param_placeholder})", (ip_address, now.isoformat() if not DATABASE_URL else now, 0))
        else:
            last_reset_val = row[0]
            ip_count = row[1]
            try:
                if isinstance(last_reset_val, str):
                    last_reset = datetime.datetime.fromisoformat(last_reset_val)
                else:
                    last_reset = last_reset_val # datetime object from psycopg2
            except Exception:
                last_reset = now
            
            # If 24 hours have passed, reset IP count
            if (now - last_reset).total_seconds() > 86400:
                ip_count = 0
                cursor.execute(f"UPDATE ip_usage SET last_reset = {param_placeholder}, count = 0 WHERE ip = {param_placeholder}", (now.isoformat() if not DATABASE_URL else now, ip_address))
        
        if ip_count >= max_ip_daily:
            conn.rollback()
            conn.close()
            return False, "Daily limit reached for your IP (2 jobs/day)."
            
        # --- Consume Quota ---
        cursor.execute(f"UPDATE global_usage SET count = count + 1 WHERE month_year = {param_placeholder}", (month_year,))
        cursor.execute(f"UPDATE ip_usage SET count = count + 1 WHERE ip = {param_placeholder}", (ip_address,))
        conn.commit()
        conn.close()
        
        return True, "Quota consumed."
    except Exception as e:
        print(f"Quota DB Error: {e}")
        return False, "Service temporarily unavailable (DB Error)"
