import { useState, type JSX } from 'react';
import { Text, useApp, useInput } from 'ink';
import type { Feed, Story } from '../api/firebase.js';
import { Comments } from './Comments.js';
import { Body, Footer, Header, Screen } from './Layout.js';
import { SearchInput } from './SearchInput.js';
import { SearchResults } from './SearchResults.js';
import { StoryDetail } from './StoryDetail.js';
import { StoryList } from './StoryList.js';
import { theme } from './theme.js';

type ListLikeView = { name: 'list' } | { name: 'search'; query: string; from: 'tui' | 'cli' };

type View =
  | ListLikeView
  | { name: 'detail'; story: Story; returnTo: ListLikeView }
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
  const { exit } = useApp();

  useInput((input) => {
    if (input === 'q' && view.name !== 'search-input') exit();
  });

  return (
    <Screen>
      <Header>
        <Text color={theme.colors.title}>hn</Text>
      </Header>
      <Body>{renderView(view, { feed, setFeed, setView, exit })}</Body>
      <Footer />
    </Screen>
  );
}

interface ViewContext {
  feed: Feed;
  setFeed: (feed: Feed) => void;
  setView: (view: View) => void;
  exit: () => void;
}

function renderView(view: View, ctx: ViewContext): JSX.Element {
  if (view.name === 'list') return renderList(ctx);
  if (view.name === 'search') return renderSearch(view, ctx);
  if (view.name === 'search-input') return renderSearchInput(view, ctx);
  if (view.name === 'detail') return renderDetail(view, ctx);
  return renderComments(view, ctx);
}

function renderList({ feed, setFeed, setView }: ViewContext): JSX.Element {
  return (
    <StoryList
      feed={feed}
      onFeedChange={setFeed}
      onSelectStory={(story) => setView({ name: 'detail', story, returnTo: { name: 'list' } })}
      onSearchRequested={() => setView({ name: 'search-input', from: 'tui' })}
    />
  );
}

function renderSearch(view: View & { name: 'search' }, { setView, exit }: ViewContext): JSX.Element {
  return (
    <SearchResults
      query={view.query}
      from={view.from}
      onSelectStory={(story) =>
        setView({ name: 'detail', story, returnTo: { name: 'search', query: view.query, from: view.from } })
      }
      onExit={() => (view.from === 'tui' ? setView({ name: 'list' }) : exit())}
      onSearchAgain={() => setView({ name: 'search-input', from: view.from })}
    />
  );
}

function renderSearchInput(view: View & { name: 'search-input' }, { setView }: ViewContext): JSX.Element {
  return (
    <SearchInput
      onSubmit={(query) => setView({ name: 'search', query, from: view.from })}
      onCancel={() => setView({ name: 'list' })}
    />
  );
}

function renderDetail(view: View & { name: 'detail' }, { setView }: ViewContext): JSX.Element {
  return (
    <StoryDetail
      story={view.story}
      onBack={() => setView(view.returnTo)}
      onOpenComments={() => setView({ name: 'comments', story: view.story, returnTo: view.returnTo })}
    />
  );
}

function renderComments(view: View & { name: 'comments' }, { setView }: ViewContext): JSX.Element {
  return (
    <Comments
      story={view.story}
      onBack={() => setView({ name: 'detail', story: view.story, returnTo: view.returnTo })}
    />
  );
}
