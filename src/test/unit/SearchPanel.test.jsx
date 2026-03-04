import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import SearchPanel from '../../components/editor/SearchPanel';

// Mock the sefaria service
vi.mock('../../services/sefaria', () => ({
  getSefariaText: vi.fn(),
  searchSefariaText: vi.fn(),
}));

// Mock the sheet store — getState().addSource must be a spy
const mockAddSource = vi.fn();
vi.mock('../../stores/useSheetStore', () => {
  const useSheetStore = () => ({});
  useSheetStore.getState = () => ({ addSource: mockAddSource });
  return { default: useSheetStore };
});

import { getSefariaText, searchSefariaText } from '../../services/sefaria';

describe('SearchPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockAddSource.mockReset();
    // Default: getSefariaText returns a valid result
    getSefariaText.mockResolvedValue({
      ref: 'Genesis 1:1',
      he: 'בְּרֵאשִׁית',
      en: 'In the beginning',
      versionTitle: 'KJV',
      versions: [],
    });
    searchSefariaText.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders without crashing', () => {
    render(<SearchPanel />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders a search input with placeholder referencing Genesis 1:1', () => {
    render(<SearchPanel />);
    const input = screen.getByRole('textbox');
    expect(input.placeholder).toContain('Genesis 1:1');
  });

  it('does not call getSefariaText when input is empty', async () => {
    render(<SearchPanel />);
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(getSefariaText).not.toHaveBeenCalled();
  });

  it('does not call getSefariaText before 400ms debounce elapses', async () => {
    render(<SearchPanel />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Genesis 1:1' } });
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(getSefariaText).not.toHaveBeenCalled();
  });

  it('calls getSefariaText after 400ms with the query value', async () => {
    render(<SearchPanel />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Genesis 1:1' } });
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(getSefariaText).toHaveBeenCalledWith('Genesis 1:1');
  });

  it('only fires one API call when query changes quickly (debounce resets)', async () => {
    render(<SearchPanel />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Gen' } });
    await act(async () => { vi.advanceTimersByTime(200); });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Genesis' } });
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(getSefariaText).toHaveBeenCalledTimes(1);
    expect(getSefariaText).toHaveBeenCalledWith('Genesis');
  });

  it('shows a result card when getSefariaText returns a valid result', async () => {
    getSefariaText.mockResolvedValue({
      ref: 'Genesis 1:1',
      he: 'בְּרֵאשִׁית',
      en: 'In the beginning',
      versionTitle: 'KJV',
      versions: [],
    });
    render(<SearchPanel />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Genesis 1:1' } });
    await act(async () => { vi.advanceTimersByTime(400); });
    await waitFor(() => {
      expect(screen.getByText('Genesis 1:1')).toBeInTheDocument();
    });
  });

  it('falls back to searchSefariaText when getSefariaText returns error object', async () => {
    getSefariaText.mockResolvedValue({ error: 'Not found' });
    searchSefariaText.mockResolvedValue([
      { ref: 'Genesis 1:2', he: 'וְהָאָרֶץ', en: 'And the earth' },
    ]);
    render(<SearchPanel />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'genesis' } });
    await act(async () => { vi.advanceTimersByTime(400); });
    await waitFor(() => {
      expect(searchSefariaText).toHaveBeenCalledWith('genesis');
    });
  });

  it('falls back to searchSefariaText when getSefariaText returns null', async () => {
    getSefariaText.mockResolvedValue(null);
    searchSefariaText.mockResolvedValue([
      { ref: 'Genesis 1:2', he: 'וְהָאָרֶץ', en: 'And the earth' },
    ]);
    render(<SearchPanel />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'genesis' } });
    await act(async () => { vi.advanceTimersByTime(400); });
    await waitFor(() => {
      expect(searchSefariaText).toHaveBeenCalledWith('genesis');
    });
  });

  it('shows no-results error when both APIs return empty', async () => {
    getSefariaText.mockResolvedValue({ error: 'Not found' });
    searchSefariaText.mockResolvedValue([]);
    render(<SearchPanel />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'xyzzy' } });
    await act(async () => { vi.advanceTimersByTime(400); });
    await waitFor(() => {
      expect(screen.getByText(/No results found/i)).toBeInTheDocument();
    });
  });

  it('shows connection error message on network failure', async () => {
    getSefariaText.mockRejectedValue(new Error('Network error'));
    render(<SearchPanel />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Genesis' } });
    await act(async () => { vi.advanceTimersByTime(400); });
    await waitFor(() => {
      expect(screen.getByText(/Search failed/i)).toBeInTheDocument();
    });
  });

  it('clears query and results after clicking Add to Sheet', async () => {
    getSefariaText.mockResolvedValue({
      ref: 'Genesis 1:1',
      he: 'בְּרֵאשִׁית',
      en: 'In the beginning',
      versionTitle: 'KJV',
      versions: [],
    });
    render(<SearchPanel />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Genesis 1:1' } });
    await act(async () => { vi.advanceTimersByTime(400); });
    await waitFor(() => {
      expect(screen.getByText('Add to Sheet')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Add to Sheet'));
    await waitFor(() => {
      expect(screen.getByRole('textbox').value).toBe('');
      expect(screen.queryByText('Genesis 1:1')).not.toBeInTheDocument();
    });
  });

  it('calls useSheetStore.getState().addSource with correct shape on add', async () => {
    getSefariaText.mockResolvedValue({
      ref: 'Genesis 1:1',
      he: 'בְּרֵאשִׁית',
      en: 'In the beginning',
      versionTitle: 'KJV',
      versions: [],
    });
    render(<SearchPanel />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Genesis 1:1' } });
    await act(async () => { vi.advanceTimersByTime(400); });
    await waitFor(() => {
      expect(screen.getByText('Add to Sheet')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Add to Sheet'));
    expect(mockAddSource).toHaveBeenCalledWith({
      type: 'source',
      ref: 'Genesis 1:1',
      he: 'בְּרֵאשִׁית',
      en: 'In the beginning',
      versionTitle: 'KJV',
      versions: [],
    });
  });

  it('shows loading indicator while API call is in flight', async () => {
    let resolveGetText;
    getSefariaText.mockReturnValue(
      new Promise(resolve => { resolveGetText = resolve; })
    );
    render(<SearchPanel />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Genesis' } });
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(screen.getByText(/Searching/i)).toBeInTheDocument();
    await act(async () => {
      resolveGetText({ ref: 'Genesis 1:1', he: 'text', en: 'text', versionTitle: null, versions: [] });
    });
    await waitFor(() => {
      expect(screen.queryByText(/Searching/i)).not.toBeInTheDocument();
    });
  });
});
