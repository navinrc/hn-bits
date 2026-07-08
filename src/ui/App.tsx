import { useState, type JSX, type ReactNode } from 'react';
import { useApp, useInput } from 'ink';
import type { Feed, Story } from '../api/firebase.js';
import { Comments } from './Comments.js';
import { HelpOverlay } from './HelpOverlay.js';
import { COMMENTS_KEYS, LIST_KEYS, SEARCH_RESULTS_KEYS, footerHint, type KeyBinding } from './keymap.js';
import { Body, Footer, Header, Screen } from './Layout.js';
import { SearchInput } from './SearchInput.js';
import { SearchResults } from './SearchResults.js';
import { StoryList } from './StoryList.js';
import { TabBar } from './TabBar.js';

type ListLikeView = { name: 'list' } | { name: 'search'; query: string; from: 'tui' | 'cli' };

type View =
  | ListLikeView
  | { name: 'comments'; story: Story; returnTo: ListLikeView }
  | { name: 'search-input'; from: 'tui' | 'cli' };

interface AppProps {
  initialQuery?: string;
}

export function App({ initialQuery }: AppProps): JSX.Element {
  const [feed, setFeed] = useState<Feed>('top');
  const [view, setView] = useState<View>(
    initialQuery ? { name: 'search', query: initialQuery, from: 'cli' } : { name: 'list' },
  );
  const [helpOpen, setHelpOpen] = useState(false);
  const { exit } = useApp();

  useInput((input) => {
    if (helpOpen) return setHelpOpen(false);
    if (input === 'q' && view.name !== 'search-input') return exit();
    if (input === '?' && view.name !== 'search-input') return setHelpOpen(true);
  });

  const ctx: ViewContext = { feed, setFeed, setView, exit };

  return (
    <Screen>
      <Header>
        <TabBar active={feed} />
      </Header>
      <Body>{helpOpen ? <HelpOverlay {...helpFor(view)} /> : renderBody(view, ctx)}</Body>
      <Footer>{renderFooter(view, ctx)}</Footer>
    </Screen>
  );
}

interface ViewContext {
  feed: Feed;
  setFeed: (feed: Feed) => void;
  setView: (view: View) => void;
  exit: () => void;
}

function renderBody(view: View, ctx: ViewContext): JSX.Element | null {
  if (view.name === 'list') return renderList(ctx);
  if (view.name === 'search') return renderSearch(view, ctx);
  if (view.name === 'search-input') return null;
  return renderComments(view, ctx);
}

function renderFooter(view: View, ctx: ViewContext): ReactNode {
  if (view.name === 'search-input') {
    return (
      <SearchInput
        onSubmit={(query) => ctx.setView({ name: 'search', query, from: view.from })}
        onCancel={() => ctx.setView({ name: 'list' })}
      />
    );
  }
  if (view.name === 'list') return footerHint(LIST_KEYS);
  if (view.name === 'comments') return footerHint(COMMENTS_KEYS);
  return footerHint(SEARCH_RESULTS_KEYS);
}

function helpFor(view: View): { title: string; keys: readonly KeyBinding[] } {
  if (view.name === 'comments') return { title: 'comments', keys: COMMENTS_KEYS };
  if (view.name === 'search') return { title: 'search results', keys: SEARCH_RESULTS_KEYS };
  return { title: 'story list', keys: LIST_KEYS };
}

function renderList({ feed, setFeed, setView }: ViewContext): JSX.Element {
  return (
    <StoryList
      feed={feed}
      onFeedChange={setFeed}
      onSelectStory={(story) => setView({ name: 'comments', story, returnTo: { name: 'list' } })}
      onSearchRequested={() => setView({ name: 'search-input', from: 'tui' })}
    />
  );
}

function renderSearch(view: View & { name: 'search' }, { setView, exit }: ViewContext): JSX.Element {
  return (
    <SearchResults
      query={view.query}
      onSelectStory={(story) =>
        setView({ name: 'comments', story, returnTo: { name: 'search', query: view.query, from: view.from } })
      }
      onExit={() => (view.from === 'tui' ? setView({ name: 'list' }) : exit())}
      onSearchAgain={() => setView({ name: 'search-input', from: view.from })}
    />
  );
}

function renderComments(view: View & { name: 'comments' }, { setView }: ViewContext): JSX.Element {
  return <Comments story={view.story} onBack={() => setView(view.returnTo)} />;
}
