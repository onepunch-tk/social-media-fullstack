import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { createStyleSheet, useStyles } from 'stylo-native';

const styles = createStyleSheet((t) => ({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.bg,
    padding: t.space.lg,
  },
  title: { color: t.colors.fg, fontSize: 20, fontWeight: '600' },
  link: { color: t.colors.ok, marginTop: t.space.md },
}));

export default function NotFoundScreen() {
  const s = useStyles(styles);
  return (
    <View style={s.container}>
      <Text style={s.title}>페이지를 찾을 수 없습니다</Text>
      <Link href="/" style={s.link}>
        홈으로 돌아가기
      </Link>
    </View>
  );
}
