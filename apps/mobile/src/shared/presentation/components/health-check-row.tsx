import type { HealthCheck } from '@social/schemas';
import { memo } from 'react';
import { Text, View } from 'react-native';
import { createStyleSheet, useStyles } from 'stylo-native';

const styles = createStyleSheet((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: t.space.sm,
  },
  name: { color: t.colors.fg, fontWeight: '600' },
  meta: { flexDirection: 'row', gap: t.space.sm },
  ok: { color: t.colors.ok },
  fail: { color: t.colors.fail },
  latency: { color: t.colors.muted },
}));

type HealthCheckRow = { check: HealthCheck };

function HealthCheckRow({ check }: HealthCheckRow) {
  const s = useStyles(styles);
  return (
    <View style={s.row}>
      <Text style={s.name}>{check.name}</Text>
      <View style={s.meta}>
        <Text style={check.status === 'ok' ? s.ok : s.fail}>{check.status}</Text>
        {check.latencyMs !== undefined && <Text style={s.latency}>{check.latencyMs} ms</Text>}
      </View>
    </View>
  );
}

// FlashList v2는 재활용 시 row를 다른 item으로 다시 렌더한다 — memo로 불필요한 리렌더를 막는다.
export default memo(HealthCheckRow);
