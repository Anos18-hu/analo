export const calculateAverage = (data: number[]): number => {
  if (data.length === 0) return 0;
  return data.reduce((sum, value) => sum + value, 0) / data.length;
};

export const calculatePassPercentage = (data: number[], threshold: number = 10): number => {
  if (data.length === 0) return 0;
  const passed = data.filter((grade) => grade >= threshold).length;
  return (passed / data.length) * 100;
};

export const calculateStandardDeviation = (data: number[]): number => {
  if (data.length === 0) return 0;
  const average = calculateAverage(data);
  const variance = data.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / data.length;
  return Math.sqrt(variance);
};

export const calculateMode = (data: number[]): number => {
  if (data.length === 0) return 0;
  const frequency: { [key: number]: number } = {};
  let maxFreq = 0;
  let mode = data[0];

  data.forEach((val) => {
    frequency[val] = (frequency[val] || 0) + 1;
    if (frequency[val] > maxFreq) {
      maxFreq = frequency[val];
      mode = val;
    }
  });

  return mode;
};

export const calculateCV = (average: number, stdDev: number): number => {
  if (average === 0) return 0;
  return (stdDev / average) * 100;
};

export const calculateCorrelation = (x: number[], y: number[]): number => {
  const n = x.length;
  if (n !== y.length || n === 0) return 0;

  const xBar = calculateAverage(x);
  const yBar = calculateAverage(y);

  const numerator = x.reduce((sum, xi, i) => sum + (xi - xBar) * (y[i] - yBar), 0);
  const denominatorX = Math.sqrt(x.reduce((sum, xi) => sum + Math.pow(xi - xBar, 2), 0));
  const denominatorY = Math.sqrt(y.reduce((sum, yi) => sum + Math.pow(yi - yBar, 2), 0));

  if (denominatorX === 0 || denominatorY === 0) return 0;

  return numerator / (denominatorX * denominatorY);
};