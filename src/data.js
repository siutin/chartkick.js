import { isArray, isPlainObject, toStr, toFloat, toDate, toArr, isDate, isNumber } from "./helpers";

function formatSeriesBubble(data) {
  const r = [];
  for (let i = 0; i < data.length; i++) {
    r.push(Object.assign(data[i], { x: toFloat(data[i].x), y: toFloat(data[i].y), z: toFloat(data[i].z) }));
  }
  return r;
}

// casts data to proper type
// sorting is left to adapters
function formatSeriesData(data, keyType) {
  if (keyType === "bubble") {
    return formatSeriesBubble(data);
  }

  let keyFunc;
  if (keyType === "number") {
    keyFunc = toFloat;
  } else if (keyType === "datetime") {
    keyFunc = toDate;
  } else {
    keyFunc = toStr;
  }

  const r = [];
  for (let i = 0; i < data.length; i++) {
    let o = {}
    if (Object.prototype.hasOwnProperty.call(data[i], 'x')) {
      o.x = keyFunc(data[i].x)
    }
    if (Object.prototype.hasOwnProperty.call(data[i], 'y')) {
      o.y = toFloat(data[i].y)
    }
    r.push(Object.assign(data[i], o));
  }
  return r;
}

function detectXType(series, noDatetime, options) {
  if (dataEmpty(series)) {
    if ((options.xmin || options.xmax) && (!options.xmin || isDate(options.xmin)) && (!options.xmax || isDate(options.xmax))) {
      return "datetime";
    } else {
      return "number";
    }
  } else if (detectXTypeWithFunction(series, isNumber)) {
    return "number";
  } else if (!noDatetime && detectXTypeWithFunction(series, isDate)) {
    return "datetime";
  } else {
    return "string";
  }
}

function detectXTypeWithFunction(series, func) {
  for (let i = 0; i < series.length; i++) {
    const data = series[i].data;
    for (let j = 0; j < data.length; j++) {
      if (!func(data[j].x)) {
        return false;
      }
    }
  }
  return true;
}

// creates a shallow copy of each element of the array
// elements are expected to be objects
function copySeries(series) {
  const newSeries = [];
  for (let i = 0; i < series.length; i++) {
    const copy = {};
    for (const j in series[i]) {
      if (Object.prototype.hasOwnProperty.call(series[i], j)) {
        copy[j] = series[i][j];
      }
    }
    newSeries.push(copy);
  }
  return newSeries;
}

function processSeries(chart, keyType, noDatetime) {
  const opts = chart.options;
  let series = chart.rawData;

  // see if one series or multiple
  chart.singleSeriesFormat = !isArray(series) || !isPlainObject(series[0]);
  if (chart.singleSeriesFormat) {
    series = [{name: opts.label, data: series}];
  }

  // must come before dataEmpty check
  series = copySeries(series);

  chart.xtype = keyType || (opts.discrete ? "string" : detectXType(series, noDatetime, opts));

  // right format
  for (let i = 0; i < series.length; i++) {
    series[i].data = formatSeriesData(series[i].data, chart.xtype);
  }

  return series;
}

function processSimple(chart) {
  const perfectData = chart.rawData;
  for (let i = 0; i < perfectData.length; i++) {
    let o = {}
    if (Object.prototype.hasOwnProperty.call(perfectData[i], 'x')) {
      o.x = toStr(perfectData[i].x)
    }
    if (Object.prototype.hasOwnProperty.call(perfectData[i], 'y')) {
      o.y = toFloat(perfectData[i].y)
    }
    perfectData[i] = Object.assign(perfectData[i], o);
  }
  return perfectData;
}

function dataEmpty(data, chartType) {
  if (chartType === "PieChart" || chartType === "GeoChart" || chartType === "Timeline") {
    return data.length === 0;
  } else {
    for (let i = 0; i < data.length; i++) {
      if (data[i].data.length > 0) {
        return false;
      }
    }
    return true;
  }
}

export { dataEmpty, processSeries, processSimple };
