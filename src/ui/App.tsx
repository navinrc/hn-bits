import { useState, type JSX, type ReactNode } from 'react';
import { useApp, useInput } from 'ink';
import type { CommentNode } from '../api/algolia.js';
import type { Feed, Story } from '../api/firebase.js';
import { loadConfig, type Config } from '../lib/config.js';
import { nextTab, previousTab, type TabId } from '../lib/listNavigation.js';
import { AskAI } from './AskAI.js';
import { Comments } from './Comments.js';
import { HelpOverlay } from './HelpOverlay.js';
import { COMMENTS_KEYS, LIST_KEYS, SAVED_KEYS, SEARCH_RESULTS_KEYS, footerHint, type KeyBinding } from './keymap.js';
import { Body, Footer, Header, Screen } from './Layout.js';
import { SavedList } from './SavedList.js';
import { SearchInput } from './SearchInput.js';
import { SearchResults } from './SearchResults.js';
import { StoryList } from './StoryList.js';
import { TabBar } from './TabBar.js';

type ListLikeView =
  | { name: 'list' }
  | { name: 'search'; query: string; from: 'tui' | 'cli' }
  | { name: 'saved' };
type CommentsView = { name: 'comments'; story: Story; returnTo: ListLikeView };
type NonAskView = ListLikeView | CommentsView;

type View =
  | NonAskView
  | { name: 'ask'; story: Story; comments: CommentNode[] | null; returnTo: NonAskView }
  | { name: 'search-input'; from: 'tui' | 'cli' };

interface AppProps {
  initialQuery?: string;
  initialView?: 'saved';
}

export function App({ initialQuery, initialView }: AppProps): JSX.Element {
  const [feed, setFeed] = useState<Feed>('top');
  const [view, setView] = useState<View>(
    initialQuery
      ? { name: 'search', query: initialQuery, from: 'cli' }
      : initialView === 'saved'
        ? { name: 'saved' }
        : { name: 'list' },
  );
  const [helpOpen, setHelpOpen] = useState(false);
  const [config] = useState(loadConfig);
  const { exit } = useApp();

  useInput((input) => {
    if (helpOpen) return setHelpOpen(false);
    if (view.name === 'search-input' || view.name === 'ask') return;
    if (input === 'q') return exit();
    if (input === '?') return setHelpOpen(true);
  });

  function changeFeed(target: Feed): void {
    setFeed(target);
    setView({ name: 'list' });
  }

  function changeTab(direction: 1 | -1): void {
    const current: TabId = view.name === 'saved' ? 'saved' : feed;
    const next = direction === 1 ? nextTab(current) : previousTab(current);
    if (next === 'saved') return setView({ name: 'saved' });
    changeFeed(next);
  }

  const ctx: ViewContext = { feed, config, setFeed: changeFeed, setTab: changeTab, setView, exit };
  const activeTab: TabId = view.name === 'saved' ? 'saved' : feed;

  return (
    <Screen>
      <Header>
        <TabBar active={activeTab} />
      </Header>
      <Body>{helpOpen ? <HelpOverlay {...helpFor(view)} /> : renderBody(view, ctx)}</Body>
      <Footer>{renderFooter(view, ctx)}</Footer>
    </Screen>
  );
}

interface ViewContext {
  feed: Feed;
  config: Config | null;
  setFeed: (feed: Feed) => void;
  setTab: (direction: 1 | -1) => void;
  setView: (view: View) => void;
  exit: () => void;
}

function renderBody(view: View, ctx: ViewContext): JSX.Element | null {
  if (view.name === 'list') return renderList(ctx);
  if (view.name === 'saved') return renderSaved(ctx);
  if (view.name === 'search') return renderSearch(view, ctx);
  if (view.name === 'search-input') return null;
  if (view.name === 'ask') return renderAskAI(view, ctx);
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
  if (view.name === 'ask') return null;
  if (view.name === 'list') return footerHint(LIST_KEYS);
  if (view.name === 'saved') return footerHint(SAVED_KEYS);
  if (view.name === 'comments') return footerHint(COMMENTS_KEYS);
  return footerHint(SEARCH_RESULTS_KEYS);
}

function helpFor(view: View): { title: string; keys: readonly KeyBinding[] } {
  if (view.name === 'comments') return { title: 'comments', keys: COMMENTS_KEYS };
  if (view.name === 'search') return { title: 'search results', keys: SEARCH_RESULTS_KEYS };
  if (view.name === 'saved') return { title: 'saved', keys: SAVED_KEYS };
  return { title: 'story list', keys: LIST_KEYS };
}

function renderList({ feed, config, setFeed, setTab, setView }: ViewContext): JSX.Element {
  return (
    <StoryList
      feed={feed}
      config={config}
      onFeedChange={setFeed}
      onTabChange={setTab}
      onSelectStory={(story) => setView({ name: 'comments', story, returnTo: { name: 'list' } })}
      onSearchRequested={() => setView({ name: 'search-input', from: 'tui' })}
      onAskAI={(story) => setView({ name: 'ask', story, comments: null, returnTo: { name: 'list' } })}
    />
  );
}

function renderSaved({ config, setFeed, setTab, setView }: ViewContext): JSX.Element {
  return (
    <SavedList
      config={config}
      onFeedChange={setFeed}
      onTabChange={setTab}
      onSelectStory={(story) => setView({ name: 'comments', story, returnTo: { name: 'saved' } })}
      onSearchRequested={() => setView({ name: 'search-input', from: 'tui' })}
      onAskAI={(story) => setView({ name: 'ask', story, comments: null, returnTo: { name: 'saved' } })}
    />
  );
}

function renderSearch(view: View & { name: 'search' }, { config, setView, exit }: ViewContext): JSX.Element {
  const returnTo: ListLikeView = { name: 'search', query: view.query, from: view.from };
  return (
    <SearchResults
      query={view.query}
      config={config}
      onSelectStory={(story) => setView({ name: 'comments', story, returnTo })}
      onExit={() => (view.from === 'tui' ? setView({ name: 'list' }) : exit())}
      onSearchAgain={() => setView({ name: 'search-input', from: view.from })}
      onAskAI={(story) => setView({ name: 'ask', story, comments: null, returnTo })}
    />
  );
}

function renderComments(view: View & { name: 'comments' }, { config, setView }: ViewContext): JSX.Element {
  return (
    <Comments
      story={view.story}
      config={config}
      onBack={() => setView(view.returnTo)}
      onAskAI={(comments) => setView({ name: 'ask', story: view.story, comments, returnTo: view })}
    />
  );
}

function renderAskAI(view: View & { name: 'ask' }, { config, setView }: ViewContext): JSX.Element {
  return (
    <AskAI
      story={view.story}
      comments={view.comments}
      config={config}
      onBack={() => setView(view.returnTo)}
    />
  );
}
