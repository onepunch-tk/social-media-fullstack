import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import type { HealthCheck } from '@social/schemas';
import { useQuery } from '@tanstack/react-query';
import { Pressable, Text, View } from 'react-native';
import { createStyleSheet, useStyles } from 'stylo-native';
import { fetchHealth } from '../../infrastructure/http/api-client';
import HealthCheckRow from '../components/health-check-row';

const styles = createStyleSheet((t) => ({
  container: { flex: 1, backgroundColor: t.colors.bg, padding: t.space.lg },
  title: { color: t.colors.fg, fontSize: 20, fontWeight: '600' },
  muted: { color: t.colors.muted, marginBottom: t.space.md },
  error: { color: t.colors.fail },
  retry: { alignSelf: 'flex-start', marginTop: t.space.md, padding: t.space.sm },
  retryText: { color: t.colors.fg, fontWeight: '600' },
}));

// renderItem·keyExtractor는 모듈 상수로 고정해 FlashList가 매 렌더 새 함수를 받지 않게 한다.
const keyExtractor = (check: HealthCheck) => check.name;
const renderItem: ListRenderItem<HealthCheck> = ({ item }) => <HealthCheckRow check={item} />;

function EmptyChecks() {
  const s = useStyles(styles);
  return <Text style={s.muted}>검사 항목 없음</Text>;
}

export default function HomeScreen() {
  const s = useStyles(styles);
  const query = useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => fetchHealth(signal),
  });

  if (query.isPending) {
    return (
      <View style={s.container}>
        <Text style={s.muted}>확인 중…</Text>
      </View>
    );
  }

  if (query.isError) {
    return (
      <View style={s.container}>
        <Text style={s.error}>
          상태를 불러오지 못했습니다: code:{query.error.code} {query.error.message}
        </Text>
        <Pressable
          style={s.retry}
          onPress={() => {
            void query.refetch();
          }}
        >
          <Text style={s.retryText}>재시도</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>API 상태: {query.data.status}</Text>
      <Text style={s.muted}>{query.data.timestamp}</Text>
      <FlashList
        data={query.data.checks}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListEmptyComponent={EmptyChecks}
      />
    </View>
  );
}
