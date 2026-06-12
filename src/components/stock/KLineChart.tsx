import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface KLineChartProps {
  data: {
    date: string;
    open: number;
    close: number;
    high: number;
    low: number;
    volume: number;
  }[];
  height?: number;
}

export const KLineChart: React.FC<KLineChartProps> = ({ data, height = 400 }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    chartInstanceRef.current = echarts.init(chartRef.current, 'dark');

    return () => {
      chartInstanceRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!chartInstanceRef.current || !data.length) return;

    const dates = data.map((item) => item.date);
    const candleData = data.map((item) => [item.open, item.close, item.low, item.high]);
    const volumeData = data.map((item) => ({
      value: item.volume,
      itemStyle: {
        color: item.close >= item.open ? '#10b981' : '#ef4444',
      },
    }));

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      grid: [
        {
          left: '10%',
          right: '8%',
          top: '10%',
          height: '50%',
        },
        {
          left: '10%',
          right: '8%',
          top: '68%',
          height: '22%',
        },
      ],
      xAxis: [
        {
          type: 'category',
          data: dates,
          gridIndex: 0,
          axisLine: { lineStyle: { color: '#374151' } },
          axisTick: { show: false },
          axisLabel: { color: '#9ca3af', fontSize: 11 },
        },
        {
          type: 'category',
          data: dates,
          gridIndex: 1,
          axisLine: { lineStyle: { color: '#374151' } },
          axisTick: { show: false },
          axisLabel: { show: false },
        },
      ],
      yAxis: [
        {
          type: 'value',
          gridIndex: 0,
          scale: true,
          splitNumber: 4,
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: '#1f2937', type: 'dashed' } },
          axisLabel: { color: '#9ca3af', fontSize: 11 },
        },
        {
          type: 'value',
          gridIndex: 1,
          scale: true,
          splitNumber: 2,
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { color: '#9ca3af', fontSize: 11 },
        },
      ],
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          lineStyle: { color: '#6b7280', type: 'dashed' },
          crossStyle: { color: '#6b7280' },
        },
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        borderColor: '#374151',
        textStyle: { color: '#f3f4f6', fontSize: 12 },
        formatter: (params: unknown) => {
          const p = params as Array<{ dataIndex: number }>;
          const dataIndex = p[0]?.dataIndex ?? 0;
          const item = data[dataIndex];
          if (!item) return '';
          const change = ((item.close - item.open) / item.open * 100).toFixed(2);
          const changeColor = item.close >= item.open ? '#10b981' : '#ef4444';
          return `
            <div style="padding: 4px 8px;">
              <div style="font-weight: 600; margin-bottom: 4px;">${item.date}</div>
              <div style="display: grid; grid-template-columns: auto 1fr; gap: 2px 12px;">
                <span style="color: #9ca3af;">开盘:</span><span>${item.open.toFixed(2)}</span>
                <span style="color: #9ca3af;">收盘:</span><span>${item.close.toFixed(2)}</span>
                <span style="color: #9ca3af;">最高:</span><span>${item.high.toFixed(2)}</span>
                <span style="color: #9ca3af;">最低:</span><span>${item.low.toFixed(2)}</span>
                <span style="color: #9ca3af;">涨跌:</span><span style="color: ${changeColor};">${change}%</span>
                <span style="color: #9ca3af;">成交量:</span><span>${(item.volume / 10000).toFixed(2)}万</span>
              </div>
            </div>
          `;
        },
      },
      series: [
        {
          name: 'K线',
          type: 'candlestick',
          data: candleData,
          xAxisIndex: 0,
          yAxisIndex: 0,
          itemStyle: {
            color: '#10b981',
            color0: '#ef4444',
            borderColor: '#10b981',
            borderColor0: '#ef4444',
          },
        },
        {
          name: '成交量',
          type: 'bar',
          data: volumeData,
          xAxisIndex: 1,
          yAxisIndex: 1,
          barWidth: '60%',
        },
      ],
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0, 1],
          start: 0,
          end: 100,
        },
      ],
    };

    chartInstanceRef.current.setOption(option);

    const handleResize = () => {
      chartInstanceRef.current?.resize();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data]);

  return (
    <div
      ref={chartRef}
      style={{
        width: '100%',
        height: `${height}px`,
        backgroundColor: 'rgba(17, 24, 39, 0.5)',
        borderRadius: '8px',
        border: '1px solid #374151',
      }}
    />
  );
};