import { useState, type JSX, type ReactNode } from 'react';
import { useApp, useInput } from 'ink';
import type { CommentNode } from '../api/algolia.js';
import type { Feed, Story } from '../api/firebase.js';
import type { Subscription } from '../db/subscriptions.js';
import { loadConfig, type Config } from '../lib/config.js';
import { nextTab, previousTab, type TabId } from '../lib/listNavigation.js';
import { AskAI } from './AskAI.js';
import { Comments } from './Comments.js';
import { HelpOverlay } from './HelpOverlay.js';
import {
  COMMENTS_KEYS,
  LIST_KEYS,
  SAVED_KEYS,
  SEARCH_RESULTS_KEYS,
  SUB_MATCHES_KEYS,
  SUBS_KEYS,
  THEME_PICKER_KEYS,
  footerHint,
  type KeyBinding,
} from './keymap.js';
import { Body, Footer, Header, Screen } from './Layout.js';
import { SavedList } from './SavedList.js';
import { SearchInput } from './SearchInput.js';
import { SearchResults } from './SearchResults.js';
import { StoryList } from './StoryList.js';
import { SubscriptionForm } from './SubscriptionForm.js';
import { SubscriptionMatches } from './SubscriptionMatches.js';
import { SubscriptionsView } from './SubscriptionsView.js';
import { TabBar } from './TabBar.js';
import { ThemePicker } from './ThemePicker.js';
import { resolvePaletteName, resolveTheme, ThemeContext, type PaletteName } from './theme.js';

type ListLikeView =
  | { name: 'list' }
  | { name: 'search'; query: string; from: 'tui' | 'cli' }
  | { name: 'saved' }
  | { name: 'subs' };
type SubMatchesView = { name: 'sub-matches'; subscription: Subscription };
type StoryOriginView = ListLikeView | SubMatchesView;
type CommentsView = { name: 'comments'; story: Story; returnTo: StoryOriginView };
type NonAskView = StoryOriginView | CommentsView;
type SubFormView = { name: 'sub-form'; mode: 'add' | 'edit'; subscription?: Subscription; prefillQuery?: string; returnTo: View };

type View =
  | NonAskView
  | SubFormView
  | { name: 'ask'; story: Story; comments: CommentNode[] | null; returnTo: NonAskView }
  | { name: 'search-input'; from: 'tui' | 'cli' };

interface AppProps {
  initialQuery?: string;
  initialView?: 'saved' | 'subs';
}

export function App({ initialQuery, initialView }: AppProps): JSX.Element {
  const [feed, setFeed] = useState<Feed>('top');
  const [view, setView] = useState<View>(
    initialQuery
      ? { name: 'search', query: initialQuery, from: 'cli' }
      : initialView === 'saved'
        ? { name: 'saved' }
        : initialView === 'subs'
          ? { name: 'subs' }
          : { name: 'list' },
  );
  const [helpOpen, setHelpOpen] = useState(false);
  const [config] = useState(loadConfig);
  const [paletteName, setPaletteName] = useState<PaletteName>(() => resolvePaletteName());
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const activeTheme = resolveTheme(paletteName);
  const { exit } = useApp();

  useInput((input) => {
    if (themePickerOpen) return;
    if (helpOpen) return setHelpOpen(false);
    if (view.name === 'search-input' || view.name === 'ask' || view.name === 'sub-form') return;
    if (input === 'q') return exit();
    if (input === '?') return setHelpOpen(true);
    if (input === 'T') return setThemePickerOpen(true);
  });

  function handleThemeSelected(name: PaletteName): void {
    setPaletteName(name);
    setThemePickerOpen(false);
  }

  function changeFeed(target: Feed): void {
    setFeed(target);
    setView({ name: 'list' });
  }

  function changeTab(direction: 1 | -1): void {
    const next = direction === 1 ? nextTab(activeTab) : previousTab(activeTab);
    if (next === 'saved') return setView({ name: 'saved' });
    if (next === 'subs') return setView({ name: 'subs' });
    changeFeed(next);
  }

  const activeTab: TabId = tabForView(view) ?? feed;
  const ctx: ViewContext = { feed, config, setFeed: changeFeed, setTab: changeTab, setView, exit };

  return (
    <ThemeContext.Provider value={activeTheme}>
      <Screen>
        <Header>
          <TabBar active={activeTab} />
        </Header>
        <Body>
          {themePickerOpen ? (
            <ThemePicker current={paletteName} onSelect={handleThemeSelected} onCancel={() => setThemePickerOpen(false)} />
          ) : helpOpen ? (
            <HelpOverlay {...helpFor(view)} />
          ) : (
            renderBody(view, ctx)
          )}
        </Body>
        <Footer>{themePickerOpen ? footerHint(THEME_PICKER_KEYS) : renderFooter(view, ctx)}</Footer>
      </Screen>
    </ThemeContext.Provider>
  );
}

/** Traces returnTo chains back to the tab a nested view (comments/ask/sub-form) was opened from. */
function tabForView(view: View): TabId | null {
  if (view.name === 'saved' || view.name === 'subs') return view.name;
  if (view.name === 'sub-matches') return 'subs';
  if (view.name === 'comments' || view.name === 'ask' || view.name === 'sub-form') return tabForView(view.returnTo);
  return null;
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
  if (view.name === 'subs') return renderSubs(ctx);
  if (view.name === 'sub-matches') return renderSubMatches(view, ctx);
  if (view.name === 'sub-form') return renderSubForm(view, ctx);
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
  if (view.name === 'ask' || view.name === 'sub-form') return null;
  if (view.name === 'list') return footerHint(LIST_KEYS);
  if (view.name === 'saved') return footerHint(SAVED_KEYS);
  if (view.name === 'subs') return footerHint(SUBS_KEYS);
  if (view.name === 'sub-matches') return footerHint(SUB_MATCHES_KEYS);
  if (view.name === 'comments') return footerHint(COMMENTS_KEYS);
  return footerHint(SEARCH_RESULTS_KEYS);
}

function helpFor(view: View): { title: string; keys: readonly KeyBinding[] } {
  if (view.name === 'comments') return { title: 'comments', keys: COMMENTS_KEYS };
  if (view.name === 'search') return { title: 'search results', keys: SEARCH_RESULTS_KEYS };
  if (view.name === 'saved') return { title: 'saved', keys: SAVED_KEYS };
  if (view.name === 'subs') return { title: 'subs', keys: SUBS_KEYS };
  if (view.name === 'sub-matches') return { title: 'sub matches', keys: SUB_MATCHES_KEYS };
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

function renderSubs({ setFeed, setTab, setView }: ViewContext): JSX.Element {
  return (
    <SubscriptionsView
      onSelectMatches={(subscription) => setView({ name: 'sub-matches', subscription })}
      onAdd={() => setView({ name: 'sub-form', mode: 'add', returnTo: { name: 'subs' } })}
      onEdit={(subscription) => setView({ name: 'sub-form', mode: 'edit', subscription, returnTo: { name: 'subs' } })}
      onFeedChange={setFeed}
      onTabChange={setTab}
    />
  );
}

function renderSubMatches(view: View & { name: 'sub-matches' }, { config, setView }: ViewContext): JSX.Element {
  const returnTo: StoryOriginView = { name: 'sub-matches', subscription: view.subscription };
  return (
    <SubscriptionMatches
      subscription={view.subscription}
      config={config}
      onSelectStory={(story) => setView({ name: 'comments', story, returnTo })}
      onBack={() => setView({ name: 'subs' })}
      onAskAI={(story) => setView({ name: 'ask', story, comments: null, returnTo })}
    />
  );
}

function renderSubForm(view: View & { name: 'sub-form' }, { setView }: ViewContext): JSX.Element {
  return (
    <SubscriptionForm
      mode={view.mode}
      subscription={view.subscription}
      prefillQuery={view.prefillQuery}
      onSave={() => setView(view.returnTo)}
      onCancel={() => setView(view.returnTo)}
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
      onSubscribe={() => setView({ name: 'sub-form', mode: 'add', prefillQuery: view.query, returnTo })}
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
