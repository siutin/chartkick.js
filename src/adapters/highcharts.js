import { formatValue, isArray, isPlainObject, jsOptionsFunc, merge, sortByNumber, sortByNumberSeries } from "../helpers";

const defaultOptions = {
  chart: {},
  xAxis: {
    title: {
      text: null
    },
    labels: {
      style: {
        fontSize: "12px"
      }
    }
  },
  yAxis: {
    title: {
      text: null
    },
    labels: {
      style: {
        fontSize: "12px"
      }
    }
  },
  title: {
    text: null
  },
  credits: {
    enabled: false
  },
  legend: {
    borderWidth: 0
  },
  tooltip: {
    style: {
      fontSize: "12px"
    }
  },
  plotOptions: {
    areaspline: {},
    area: {},
    series: {
      marker: {}
    }
  },
  time: {
    useUTC: false
  }
};

function hideLegend(options, legend, hideLegend) {
  if (legend !== undefined) {
    options.legend.enabled = !!legend;
    if (legend && legend !== true) {
      if (legend === "top" || legend === "bottom") {
        options.legend.verticalAlign = legend;
      } else {
        options.legend.layout = "vertical";
        options.legend.verticalAlign = "middle";
        options.legend.align = legend;
      }
    }
  } else if (hideLegend) {
    options.legend.enabled = false;
  }
}

function setTitle(options, title) {
  options.title.text = title;
}

function setMin(options, min) {
  options.yAxis.min = min;
}

function setMax(options, max) {
  options.yAxis.max = max;
}

function setStacked(options, stacked) {
  const stackedValue = stacked ? (stacked === true ? "normal" : stacked) : null;
  options.plotOptions.series.stacking = stackedValue;
  options.plotOptions.area.stacking = stackedValue;
  options.plotOptions.areaspline.stacking = stackedValue;
}

function setXtitle(options, title) {
  options.xAxis.title.text = title;
}

function setYtitle(options, title) {
  options.yAxis.title.text = title;
}

const jsOptions = jsOptionsFunc(defaultOptions, hideLegend, setTitle, setMin, setMax, setStacked, setXtitle, setYtitle);

function setFormatOptions(chart, options, chartType) {
  const formatOptions = {
    prefix: chart.options.prefix,
    suffix: chart.options.suffix,
    thousands: chart.options.thousands,
    decimal: chart.options.decimal,
    precision: chart.options.precision,
    round: chart.options.round,
    zeros: chart.options.zeros
  };

  // skip when axis is an array (like with min/max)
  if (chartType !== "pie" && !isArray(options.yAxis) && !options.yAxis.labels.formatter) {
    options.yAxis.labels.formatter = function () {
      return formatValue("", this.value, formatOptions);
    };
  }

  if (!options.tooltip.pointFormatter && !options.tooltip.pointFormat) {
    options.tooltip.pointFormatter = function () {
      return '<span style="color:' + this.color + '">\u25CF</span> ' + formatValue(this.series.name + ': <b>', this.y, formatOptions) + '</b><br/>';
    };
  }
}

export default class {
  constructor(library) {
    this.name = "highcharts";
    this.library = library;
  }

  renderLineChart(chart, chartType) {
    chartType = chartType || "spline";
    let chartOptions = {};
    if (chartType === "areaspline") {
      chartOptions = {
        plotOptions: {
          areaspline: {
            stacking: "normal"
          },
          area: {
            stacking: "normal"
          },
          series: {
            marker: {
              enabled: false
            }
          }
        }
      };
    }

    if (chart.options.curve === false) {
      if (chartType === "areaspline") {
        chartType = "area";
      } else if (chartType === "spline") {
        chartType = "line";
      }
    }

    const options = jsOptions(chart, chart.options, chartOptions);
    if (chart.xtype === "number") {
      options.xAxis.type = options.xAxis.type || "linear";
    } else {
      options.xAxis.type = chart.xtype === "string" ? "category" : "datetime";
    }
    if (!options.chart.type) {
      options.chart.type = chartType;
    }
    setFormatOptions(chart, options, chartType);

    const series = chart.data;

    function toObjectItem (o) {
      if (isPlainObject(o)) {
        let newObject = {}
        if (Object.prototype.hasOwnProperty.call(o, 'x')) {
          newObject.x = o.x.getTime()
        }
        if (Object.prototype.hasOwnProperty.call(o, 'y')) {
          newObject.y = o.y
        }
        return Object.assign(o, newObject)
      }
      return { x: o[0].getTime(), y: o[1] }
    }

    for (let i = 0; i < series.length; i++) {
      series[i].name = series[i].name || "Value";

      if (chart.xtype === "datetime") {
        series[i].data = series[i].data.map(toObjectItem)
      } else if (chart.xtype === "number") {
        series[i].data = series[i].data.map(toObjectItem).sort((a, b) => sortByNumberSeries(a.x, b.x))
      }
      series[i].marker = Object.assign({ symbol: "circle" }, series[i].marker);
      if (chart.options.points === false) {
        series[i].marker.enabled = false;
      }
    }

    this.drawChart(chart, series, options);
  }

  renderScatterChart(chart) {
    const options = jsOptions(chart, chart.options, {});
    options.chart.type = "scatter";
    this.drawChart(chart, chart.data, options);
  }

  renderPieChart(chart) {
    const chartOptions = merge(defaultOptions, {});

    if (chart.options.colors) {
      chartOptions.colors = chart.options.colors;
    }
    if (chart.options.donut) {
      chartOptions.plotOptions = {pie: {innerSize: "50%"}};
    }

    if ("legend" in chart.options) {
      hideLegend(chartOptions, chart.options.legend);
    }

    if (chart.options.title) {
      setTitle(chartOptions, chart.options.title);
    }

    const options = merge(chartOptions, chart.options.library || {});
    setFormatOptions(chart, options, "pie");
    const series = [{
      type: "pie",
      name: chart.options.label || "Value",
      data: chart.data
    }];

    this.drawChart(chart, series, options);
  }

  renderColumnChart(chart, chartType) {
    chartType = chartType || "column";
    const series = chart.data;
    const options = jsOptions(chart, chart.options);
    const rows = [];
    const categories = [];
    options.chart.type = chartType;
    setFormatOptions(chart, options, chartType);

    for (let i = 0; i < series.length; i++) {
      const s = series[i];

      for (let j = 0; j < s.data.length; j++) {
        const d = s.data[j];
        if (!rows[d[0]]) {
          rows[d[0]] = new Array(series.length);
          categories.push(d[0]);
        }
        rows[d[0]][i] = d[1];
      }
    }

    if (chart.xtype === "number") {
      categories.sort(sortByNumber);
    }

    options.xAxis.categories = categories;

    const newSeries = [];
    for (let i = 0; i < series.length; i++) {
      const d = [];
      for (let j = 0; j < categories.length; j++) {
        d.push(rows[categories[j]][i] || 0);
      }

      const d2 = {
        name: series[i].name || "Value",
        data: d
      };
      if (series[i].stack) {
        d2.stack = series[i].stack;
      }

      newSeries.push(d2);
    }

    this.drawChart(chart, newSeries, options);
  }

  renderBarChart(chart) {
    this.renderColumnChart(chart, "bar");
  }

  renderAreaChart(chart) {
    this.renderLineChart(chart, "areaspline");
  }

  destroy(chart) {
    if (chart.chart) {
      chart.chart.destroy();
    }
  }

  drawChart(chart, data, options) {
    this.destroy(chart);
    if (chart.destroyed) return;

    options.chart.renderTo = chart.element.id;
    options.series = data;

    if (chart.options.code) {
      window.console.log("new Highcharts.Chart(" + JSON.stringify(options) + ");");
    }

    chart.chart = new this.library.Chart(options);
  }
}
