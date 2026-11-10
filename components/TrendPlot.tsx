import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface Props {
  data: { year: number }[] | undefined;
  currentYear: number;
  dataKey: string;
  width: number;
  height: number;
  stroke: string;
  formatter: (value: number) => [string, string];
  showZeroLine?: boolean;
}

export default function TrendPlot({
  data, currentYear, dataKey, width, height, stroke, formatter, showZeroLine,
}: Props) {
  if (!data) return null;

  return (
    <LineChart
      width={width}
      height={height}
      data={data}
      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
      <XAxis
        dataKey="year"
        tick={{ fill: '#64748b', fontSize: 10 }}
        interval="preserveStartEnd"
      />
      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} domain={['auto', 'auto']} />
      <Tooltip
        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }}
        itemStyle={{ color: stroke }}
        labelStyle={{ color: '#94a3b8' }}
        formatter={formatter}
      />
      <ReferenceLine x={currentYear} stroke="#fbbf24" strokeDasharray="3 3" />
      {showZeroLine && <ReferenceLine y={0} stroke="#ef4444" strokeWidth={2} />}
      <Line
        type="monotone"
        dataKey={dataKey}
        stroke={stroke}
        strokeWidth={3}
        dot={false}
        activeDot={{ r: 6, fill: stroke }}
        isAnimationActive={false}
      />
    </LineChart>
  );
}
