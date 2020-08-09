import React, { useMemo } from 'react';
import ReactEchartsCore from 'echarts-for-react/lib/core';
import echarts from 'echarts/lib/echarts';
import 'echarts/lib/chart/line';
import 'echarts/lib/component/tooltip';
import 'echarts/lib/component/legend';
import 'echarts/lib/component/dataZoom';

import { withMobileProp } from './ResponsiveHelpers';
import MobileZoomHandle from './MobileZoomHandle';

export const getSeriesDefaults = () =>
  ({
    symbol: 'circle' as const,
    showSymbol: false,
    type: 'line' as const,
    smooth: false,
    animation: false,
  } as const);

const TrendChart: React.FC<{
  series: echarts.EChartOption.Series[];
  mobile: boolean;
  title: string;
}> = ({ series, mobile, title }) => {
  const option = useMemo(
    () => ({
      backgroundColor: '#1d2126',
      legend: { show: true, textStyle: { color: '#fff' } },
      grid: {
        bottom: 75,
        top: mobile ? 25 : 75,
        left: mobile ? 17 : 75,
        right: mobile ? 13 : 75,
      },
      tooltip: { trigger: 'axis' as const },
      animation: true,
      graphic: mobile
        ? undefined
        : {
            type: 'text',
            top: 6,
            right: 6,
            style: {
              text: 'robintrack.net',
              fill: '#eee',
            },
          },
      xAxis: [
        {
          type: 'time' as const,
          splitNumber: mobile ? 7 : 20,
          axisLabel: {
            color: 'white',
            showMinLabel: false,
            showMaxLabel: false,
            formatter: (value: string) => {
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
      yAxis: [
        {
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
      title: { text: title },
      series,
    }),
    [series, mobile, title]
  );

  return <ReactEchartsCore echarts={echarts} option={option} />;
};

export default withMobileProp({ maxDeviceWidth: 800 })(TrendChart);
