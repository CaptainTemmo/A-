import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { generateFundFlowData, FundFlowData } from '../../data/mockStocks';

interface FundFlowChartProps {
  data?: FundFlowData[];
  height?: string;
}

export function FundFlowChart({ data, height = '300px' }: FundFlowChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  const chartData = data || generateFundFlowData(30);

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.dispose();
    }

    const chart = echarts.init(chartRef.current, 'dark');
    chartInstanceRef.current = chart;

    const dates = chartData.map(item => item.date);
    const mainFlow = chartData.map(item => item.mainFlow);
    const fiveDayFlow = chartData.map(item => item.fiveDayFlow);
    const tenDayFlow = chartData.map(item => item.tenDayFlow);

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        backgroundColor: 'rgba(17, 25, 39, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        textStyle: {
          color: '#fff'
        },
        formatter: (params: any) => {
          let result = `<div style="font-weight: 600; margin-bottom: 8px;">${params[0].axisValue}</div>`;
          params.forEach((param: any) => {
            const color = param.color instanceof Object ? param.color.colorStops?.[0]?.color : param.color;
            result += `
              <div style="display: flex; justify-content: space-between; gap: 16px; margin: 4px 0;">
                <span style="color: ${color};">${param.seriesName}</span>
                <span style="font-weight: 500;">${param.value.toFixed(2)}</span>
              </div>
            `;
          });
          return result;
        }
      },
      legend: {
        data: ['主力净流入', '5日净流入', '10日净流入'],
        textStyle: {
          color: '#9CA3AF'
        },
        top: 0,
        right: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '40px',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        axisLabel: {
          color: '#6B7280',
          formatter: (value: string) => value.slice(5)
        },
        splitLine: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        axisLine: {
          show: false
        },
        axisLabel: {
          color: '#6B7280',
          formatter: (value: number) => {
            if (Math.abs(value) >= 10000) {
              return (value / 10000).toFixed(1) + '亿';
            }
            return value.toString();
          }
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.05)'
          }
        }
      },
      series: [
        {
          name: '主力净流入',
          type: 'bar',
          stack: 'total',
          data: mainFlow,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#EF4444' },
              { offset: 1, color: '#DC2626' }
            ]),
            borderRadius: [0, 0, 0, 0]
          },
          barWidth: '40%'
        },
        {
          name: '5日净流入',
          type: 'bar',
          stack: 'total',
          data: fiveDayFlow.map((v, i) => 
            mainFlow[i] >= 0 ? Math.abs(v) : -Math.abs(v)
          ),
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#F97316' },
              { offset: 1, color: '#EA580C' }
            ])
          }
        },
        {
          name: '10日净流入',
          type: 'bar',
          stack: 'total',
          data: tenDayFlow.map((v, i) => 
            mainFlow[i] >= 0 ? Math.abs(v) : -Math.abs(v)
          ),
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#FBBF24' },
              { offset: 1, color: '#F59E0B' }
            ])
          }
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100
        }
      ]
    };

    chart.setOption(option);

    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [chartData]);

  return (
    <div className="bg-primary/60 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
      <h3 className="text-lg font-semibold text-white mb-4">资金流向</h3>
      <div ref={chartRef} style={{ height }} />
    </div>
  );
}
