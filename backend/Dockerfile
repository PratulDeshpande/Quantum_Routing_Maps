FROM python:3.11-slim

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt

RUN apt-get update && apt-get install -y --no-install-recommends gcc && \
    pip install --no-cache-dir --upgrade -r /code/requirements.txt && \
    apt-get purge -y gcc && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

# Create a non-root user (Security requirement for HF)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
	PATH=/home/user/.local/bin:$PATH

# Copy only code files, NOT .env or .git
COPY --chown=user qaoa_backend.py /code/
COPY --chown=user requirements.txt /code/

# Start Gunicorn on port 7860
CMD ["gunicorn", "-b", "0.0.0.0:7860", "qaoa_backend:app", "--timeout", "120", "--workers", "1"]