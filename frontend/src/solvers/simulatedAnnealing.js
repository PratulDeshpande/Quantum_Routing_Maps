export const solveLocalSimulation = (points, setPath, setMetrics, onComplete) => {
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  let currentPath = points.map((_, i) => i);
  for (let i = currentPath.length - 1; i > 1; i--) {
    const j = Math.floor(Math.random() * i) + 1;
    [currentPath[i], currentPath[j]] = [currentPath[j], currentPath[i]];
  }
  const getCost = (p) => {
    let dist = 0;
    for (let i = 0; i < p.length - 1; i++) {
      dist += calculateDistance(points[p[i]].lat, points[p[i]].lng, points[p[i+1]].lat, points[p[i+1]].lng);
    }
    dist += calculateDistance(points[p[p.length-1]].lat, points[p[p.length-1]].lng, points[p[0]].lat, points[p[0]].lng);
    return dist;
  };
  let bestPath = [...currentPath];
  let bestCost = getCost(bestPath);
  let temperature = 1000;
  let coolingRate = 0.90;
  let iteration = 0;
  const maxIterations = 100;
  
  const step = () => {
    if (iteration >= maxIterations || temperature < 1) {
      setPath(bestPath);
      onComplete();
      return;
    }
    let newPath = [...currentPath];
    if (newPath.length > 2) {
      let pos1 = Math.floor(Math.random() * (newPath.length - 1)) + 1;
      let pos2 = Math.floor(Math.random() * (newPath.length - 1)) + 1;
      [newPath[pos1], newPath[pos2]] = [newPath[pos2], newPath[pos1]];
    }
    const currentCost = getCost(currentPath);
    const newCost = getCost(newPath);
    if (newCost < currentCost || Math.exp((currentCost - newCost) / temperature) > Math.random()) {
      currentPath = newPath;
      if (newCost < bestCost) { bestPath = newPath; bestCost = newCost; }
    }
    setPath([...currentPath]);
    setMetrics({ energy: currentCost, depth: iteration, qubits: 0, convergence: ((iteration/maxIterations)*100).toFixed(0) });
    temperature *= coolingRate;
    iteration++;
    setTimeout(step, 25); 
  };
  step();
};
