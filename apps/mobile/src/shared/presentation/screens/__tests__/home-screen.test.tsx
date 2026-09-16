import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import HomeScreen from '../home-screen';

const fetchMock = jest.fn();

function mockJsonResponse(body: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce({ ok: status < 400, status, json: async () => body });
}

function renderHome() {
  // gcTime: Infinity — gc 타이머가 살아 있으면 Jest가 종료되지 않는다(TanStack 공식 권고).
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } },
  });
  return render(
    <QueryClientProvider client={client}>
      <HomeScreen />
    </QueryClientProvider>,
  );
}

const timestamp = '2026-09-16T00:00:00.000Z';

beforeAll(() => {
  globalThis.fetch = fetchMock;
});

beforeEach(() => {
  fetchMock.mockReset();
});

describe('HomeScreen', () => {
  it('ok 응답이면 checks[0].name을 표시한다', async () => {
    mockJsonResponse({
      status: 'ok',
      timestamp,
      checks: [{ name: 'database', status: 'ok', latencyMs: 1.5 }],
    });
    const screen = renderHome();

    expect(await screen.findByText('database')).toBeTruthy();
    expect(screen.getByText('API 상태: ok')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/health',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('503 degraded 응답도 파싱되어 fail check가 목록에 표시된다', async () => {
    mockJsonResponse(
      {
        status: 'degraded',
        timestamp,
        checks: [{ name: 'database', status: 'fail', latencyMs: 12.3 }],
      },
      503,
    );
    const screen = renderHome();

    expect(await screen.findByText('database')).toBeTruthy();
    expect(screen.getByText('fail')).toBeTruthy();
    expect(screen.getByText('API 상태: degraded')).toBeTruthy();
  });

  it('checks가 빈 배열이면 빈 상태 문구를 표시한다', async () => {
    mockJsonResponse({ status: 'ok', timestamp, checks: [] });
    const screen = renderHome();

    expect(await screen.findByText('검사 항목 없음')).toBeTruthy();
  });

  it('네트워크 실패면 에러 상태를 표시하고 재시도로 복구한다', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network request failed'));
    const screen = renderHome();

    expect(await screen.findByText(/상태를 불러오지 못했습니다/)).toBeTruthy();

    mockJsonResponse({
      status: 'ok',
      timestamp,
      checks: [{ name: 'database', status: 'ok', latencyMs: 2 }],
    });
    fireEvent.press(screen.getByText('재시도'));

    expect(await screen.findByText('database')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('응답이 Schema와 불일치하면 parse 실패로 에러 상태를 표시한다', async () => {
    mockJsonResponse({ status: 'ok', timestamp: 'not-a-date', checks: 'nope' });
    const screen = renderHome();

    expect(await screen.findByText(/상태를 불러오지 못했습니다/)).toBeTruthy();
    expect(screen.queryByText('API 상태: ok')).toBeNull();
  });
});
