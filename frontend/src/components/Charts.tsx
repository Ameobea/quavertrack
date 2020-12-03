import React, { useMemo } from 'react';
import ReactEchartsCore from 'echarts-for-react/lib/core';
import echarts from 'echarts/lib/echarts';
import 'echarts/lib/chart/line';
import 'echarts/lib/chart/scatter';
import 'echarts/lib/component/tooltip';
import 'echarts/lib/component/legend';
import 'echarts/lib/component/dataZoom';
import * as R from 'ramda';
import dayjs from 'dayjs';

import { withMobileProp } from './ResponsiveHelpers';
import MobileZoomHandle from './MobileZoomHandle';
import { PropTypesOf } from 'ameo-utils';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const analyzeTimeSeries = (series: [Date, number][], zoomStart = 0, zoomEnd = 100) => {
  const first = series[0] || [new Date('3000-04-20'), 0];
  const last = R.last(series) || [new Date('1900-04-20'), 0];

  // We limit the series to only include data points that are active in the currently displayed
  // zoom region
  const timeRangeMs = dayjs(last[0]).diff(dayjs(first[0]), 'ms');
  const windowPadding = Math.abs(MS_PER_DAY / timeRangeMs) * 100;

  const zoomStartDate = new Date(
    first[0].getTime() + (Math.max(zoomStart - windowPadding, 0) * timeRangeMs) / 100
  );
  const zoomEndDate = new Date(
    first[0].getTime() + (Math.min(zoomEnd + windowPadding, 100) * timeRangeMs) / 100
  );

  const values = (series.length > 0
    ? series.filter(([date]: [Date, number]) => date >= zoomStartDate && date <= zoomEndDate)
    : series
  ).map((arr) => arr[1]);

  const min = values.reduce(R.min, values[0] || 0);
  const max = values.reduce(R.max, values[0] || 0);

  const offset = 0.05 * (max - min);

  return { min, max, first, last, offset };
};

export const getSeriesDefaults = () =>
  ({
    symbol: 'circle' as const,
    showSymbol: false,
    type: 'line' as const,
    smooth: false,
    animation: false,
  } as const);

const getChartDefaults = (mobile: boolean, stackedArea: boolean | undefined) => ({
  backgroundColor: '#1d2126',
  legend: { show: true, textStyle: { color: '#fff' } },
  grid: {
    bottom: 75,
    top: mobile ? 25 : 75,
    left: mobile ? 27 : 75,
    right: mobile ? 13 : 75,
  },
  tooltip: {
    trigger: 'axis' as const,
    formatter: (
      params_: echarts.EChartOption.Tooltip.Format | echarts.EChartOption.Tooltip.Format[]
    ) => {
      const params = Array.isArray(params_) ? params_ : [params_];
      params.reverse();
      const formattedParams = params.map((param) => {
        const [, val]: [Date, number] = param.data!;

        return `${param.seriesName}: ${
          params.length > 1 && stackedArea
            ? (val * 100).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }) + '%'
            : val.toLocaleString()
        }`;
      });

      const date = params[0]!.data![0];
      return `${date.toLocaleString(undefined, {
        timeZoneName: 'short',
      })}<br/>${formattedParams.join('<br/>')}`;
    },
    extraCssText: 'text-align: left;',
  },
  animation: true,
  xAxis: [
    {
      type: 'time' as const,
      splitNumber: mobile ? 7 : 20,
      axisLabel: {
        color: 'white',
        showMinLabel: false,
        showMaxLabel: false,
        formatter: (value: number) => {
          // Formatted to be month/day; display year only in the first label
          const date = new Date(value);
          return `${date.getMonth() + 1}/${date.getDate()}\n${date.getFullYear()}`;
        },
      },
      axisPointer: { snap: false },
      splitLine: {
        lineStyle: { color: '#323232' },
      },
    },
  ],
  dataZoom: [
    {
      type: 'slider' as const,
      show: true,
      xAxisIndex: [0],
      showDetail: true,
      fillerColor: '#2d2f33',
      bottom: 5,
      textStyle: { color: '#fff' },
      filterMode: 'none' as const,
      realtime: false,
      ...(mobile ? { handleIcon: MobileZoomHandle, handleSize: '80%' } : {}),
    },
  ],
});

const TrendChartInner: React.FC<{
  series: echarts.EChartOption.Series[];
  mobile: boolean;
  title: string;
  inverse: boolean;
  style?: React.CSSProperties;
  stackedArea?: boolean;
}> = ({ series, mobile, title, inverse, style = {}, stackedArea }) => {
  const option = useMemo((): echarts.EChartOption => {
    const { min, max, offset } = stackedArea
      ? { min: undefined, max: undefined, offset: undefined }
      : analyzeTimeSeries(series[0].data! as any);

    const baseYAxis: echarts.EChartOption.YAxis = {
      type: 'value' as const,
      ...(mobile
        ? { axisLabel: { show: false }, axisTick: { show: false } }
        : {
            axisLabel: {
              showMinLabel: false,
              showMaxLabel: false,
              color: 'white',
            },
          }),
      splitNumber: mobile ? 7 : 10,
      splitLine: {
        lineStyle: { color: '#323232' },
      },
      min: typeof min !== 'undefined' ? min - offset! : undefined,
      max: typeof max !== 'undefined' ? max + offset! : undefined,
      inverse,
      name: series[0].name,
      nameLocation: inverse ? 'start' : 'end',
      nameTextStyle: {
        color: '#ddd',
      },
    };

    const yAxis = [baseYAxis];

    if (series.length > 1 && !stackedArea) {
      const { min, max, offset } = stackedArea
        ? { min: undefined, max: undefined, offset: undefined }
        : analyzeTimeSeries(series[1].data! as any);

      yAxis.push({
        ...baseYAxis,
        min: typeof min !== 'undefined' ? min - offset! : undefined,
        max: typeof max !== 'undefined' ? max + offset! : undefined,
        inverse: false,
        name: series[1].name,
        nameLocation: 'end',
      });
    }

    return {
      ...getChartDefaults(mobile, stackedArea),
      graphic: mobile
        ? undefined
        : {
            type: 'text',
            top: 6,
            right: 6,
            style: {
              text: 'quavertrack.net',
              fill: '#eee',
            },
          },
      yAxis,
      title: { text: title },
      series,
    };
  }, [series, mobile, title, inverse, stackedArea]);

  return (
    <ReactEchartsCore
      echarts={echarts}
      option={option}
      notMerge={stackedArea !== undefined}
      style={{ height: mobile ? 'max(30vh, 300px)' : 'max(45vh, 400px)', ...style }}
    />
  );
};

export const TrendChart = withMobileProp({ maxDeviceWidth: 800 })(TrendChartInner);

const ScatterPlotInner: React.FC<{
  series: echarts.EChartOption.Series[];
  mobile: boolean;
  tooltipFormatter?: echarts.EChartOption.Tooltip.Formatter;
  style?: React.CSSProperties;
}> = ({ series, mobile, tooltipFormatter, style }) => {
  throw new Error('test error');
  const option: echarts.EChartOption = useMemo(
    () => ({
      ...getChartDefaults(mobile, false),
      tooltip: {
        padding: 10,
        borderWidth: 1,
        formatter: tooltipFormatter,
        extraCssText: 'text-align: left;',
      },
      yAxis: [
        {
          type: 'value' as const,
          axisLabel: {
            showMinLabel: false,
            showMaxLabel: false,
            color: 'white',
            fontSize: mobile ? 10 : undefined,
          },
          splitNumber: mobile ? 7 : 10,
          splitLine: {
            lineStyle: { color: '#323232' },
          },
        },
      ],
      series,
    }),
    [series, mobile, tooltipFormatter]
  );

  return (
    <ReactEchartsCore
      echarts={echarts}
      option={option}
      style={{ height: mobile ? 'max(30vh, 300px)' : 'max(45vh, 400px)', ...(style || {}) }}
    />
  );
};

export const ScatterPlot = withMobileProp<PropTypesOf<typeof ScatterPlotInner>>({
  maxDeviceWidth: 800,
})(ScatterPlotInner);
