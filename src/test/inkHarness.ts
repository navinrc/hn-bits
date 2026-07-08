import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { render as inkRender } from 'ink';
import type { ReactElement } from 'react';

// eslint-disable-next-line no-control-regex
const ANSI_PATTERN =
  /[][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]+(?:;[a-zA-Z\d]*)*)?)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-ntqry=><~]))/g;

function stripAnsi(value: string): string {
  return value.replace(ANSI_PATTERN, '');
}

class FakeStdin extends Readable {
  isTTY = true;

  override _read(): void {}

  setRawMode(): void {}

  ref(): void {}

  unref(): void {}

  writeInput(data: string): void {
    this.push(data);
  }
}

class FakeStdout extends EventEmitter {
  isTTY = true;
  columns: number;
  rows: number;
  writable = true;

  private lastContentWrite = '';

  constructor(columns: number, rows: number) {
    super();
    this.columns = columns;
    this.rows = rows;
  }

  write(data: string): boolean {
    if (stripAnsi(data).length > 0) this.lastContentWrite = data;
    return true;
  }

  lastWrite(): string {
    return this.lastContentWrite;
  }

  emitResize(columns: number, rows: number): void {
    this.columns = columns;
    this.rows = rows;
    this.emit('resize');
  }
}

export interface TestInstance {
  stdin: FakeStdin;
  stdout: FakeStdout;
  lastFrame(): string;
  rerender(node: ReactElement): void;
  unmount(): void;
  waitUntilRenderFlush(): Promise<void>;
}

export function render(node: ReactElement, columns = 80, rows = 24): TestInstance {
  const stdin = new FakeStdin();
  const stdout = new FakeStdout(columns, rows);
  const stderr = new FakeStdout(columns, rows);

  const instance = inkRender(node, {
    stdin: stdin as unknown as NodeJS.ReadStream,
    stdout: stdout as unknown as NodeJS.WriteStream,
    stderr: stderr as unknown as NodeJS.WriteStream,
    patchConsole: false,
  });

  return {
    stdin,
    stdout,
    lastFrame: () => stripAnsi(stdout.lastWrite()),
    rerender: instance.rerender,
    unmount: instance.unmount,
    waitUntilRenderFlush: instance.waitUntilRenderFlush,
  };
}
