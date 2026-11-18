import { EventEmitter } from 'node:events';
import { ChatController } from './chat.controller';

class FakeResponse extends EventEmitter {
  headersSent = false;
  writableEnded = false;
  headers: Record<string, string | number> = {};
  chunks: string[] = [];
  jsonBody: unknown = null;

  setHeader(name: string, value: string | number) {
    this.headers[name] = value;
  }

  write(chunk: Buffer | string) {
    this.headersSent = true;
    this.chunks.push(chunk.toString());
    return true;
  }

  end() {
    this.writableEnded = true;
  }

  json(body: unknown) {
    this.headersSent = true;
    this.jsonBody = body;
    this.writableEnded = true;
  }

  get text() {
    return this.chunks.join('');
  }
}

type FakeStream = EventEmitter & { destroy: jest.Mock };

const tick = () => new Promise((resolve) => setImmediate(resolve));

const modelChunk = (content: string) =>
  Buffer.from(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`);

const parseErrorEvents = (text: string) =>
  text
    .split('\n\n')
    .filter((block) => block.includes('event: error'))
    .map((block) => {
      const dataLine = block.split('\n').find((line) => line.startsWith('data:'));
      return JSON.parse(dataLine?.replace(/^data:\s*/, '') || '{}') as Record<string, unknown>;
    });

const setup = (saveAssistantMsg = jest.fn().mockResolvedValue(undefined)) => {
  const stream = new EventEmitter() as FakeStream;
  stream.destroy = jest.fn();
  const chatService = {
    chatStream: jest.fn().mockResolvedValue({ stream, sessionId: 'session-1', provider: 'openai_compatible' }),
    saveAssistantMsg
  };
  const controller = new ChatController(chatService as never);
  const response = new FakeResponse();

  return { controller, chatService, response, saveAssistantMsg, stream };
};

const start = async (controller: ChatController, response: FakeResponse) => {
  await controller.chatStream(
    { messages: [{ role: 'user', content: '你好' }] } as never,
    { sub: 'user-1' } as never,
    response as never
  );
};

describe('chat stream failure and interruption', () => {
  it('saves the partial answer and emits a timeout event when the upstream times out after streaming started', async () => {
    const { controller, response, saveAssistantMsg, stream } = setup();
    await start(controller, response);

    stream.emit('data', modelChunk('已经生成的部分'));
    stream.emit('error', Object.assign(new Error('timeout of 120000ms exceeded'), { code: 'ETIMEDOUT' }));
    await tick();

    expect(saveAssistantMsg).toHaveBeenCalledTimes(1);
    expect(saveAssistantMsg).toHaveBeenCalledWith('user-1', 'session-1', '已经生成的部分', '');
    expect(response.text).toContain('event: error');
    expect(parseErrorEvents(response.text)).toEqual([
      expect.objectContaining({ type: 'chat-error', code: 'timeout', message: expect.stringContaining('超时') })
    ]);
    expect(response.writableEnded).toBe(true);
  });

  it('emits a connection/upstream failure event instead of silently ending after headers were sent', async () => {
    const { controller, response, saveAssistantMsg, stream } = setup();
    await start(controller, response);

    stream.emit('data', modelChunk('写到一半'));
    stream.emit('error', Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }));
    await tick();

    expect(saveAssistantMsg).toHaveBeenCalledWith('user-1', 'session-1', '写到一半', '');
    expect(parseErrorEvents(response.text)).toEqual([
      expect.objectContaining({ code: 'connection_closed', message: expect.stringContaining('连接中断') })
    ]);
    expect(response.writableEnded).toBe(true);
  });

  it('treats an upstream abort as a stream error, not a client disconnect', async () => {
    const { controller, response, saveAssistantMsg, stream } = setup();
    await start(controller, response);

    stream.emit('data', modelChunk('上游中断前的正文'));
    stream.emit('aborted');
    stream.emit('error', Object.assign(new Error('aborted'), { code: 'ECONNRESET' }));
    await tick();

    expect(saveAssistantMsg).toHaveBeenCalledTimes(1);
    expect(saveAssistantMsg).toHaveBeenCalledWith('user-1', 'session-1', '上游中断前的正文', '');
    expect(parseErrorEvents(response.text)).toEqual([
      expect.objectContaining({ code: 'connection_closed', message: expect.stringContaining('连接中断') })
    ]);
    expect(response.writableEnded).toBe(true);
  });

  it('does not save or leave an empty assistant message when the client stops before any content', async () => {
    const { controller, response, saveAssistantMsg, stream } = setup();
    await start(controller, response);

    response.emit('close');
    await tick();

    expect(saveAssistantMsg).not.toHaveBeenCalled();
    expect(stream.destroy).toHaveBeenCalledTimes(1);
    expect(response.text).toBe('');
  });

  it('saves the generated answer once when the client disconnects, without duplicating on later end/error', async () => {
    const { controller, response, saveAssistantMsg, stream } = setup();
    await start(controller, response);

    stream.emit('data', modelChunk('停止前的正文'));
    response.emit('close');
    await tick();

    expect(saveAssistantMsg).toHaveBeenCalledTimes(1);
    expect(saveAssistantMsg).toHaveBeenCalledWith('user-1', 'session-1', '停止前的正文', '');
    expect(stream.destroy).toHaveBeenCalledTimes(1);

    stream.emit('end');
    stream.emit('error', new Error('destroyed'));
    await tick();

    expect(saveAssistantMsg).toHaveBeenCalledTimes(1);
    expect(response.text).not.toContain('event: error');
  });

  it('does not save an empty assistant message when the stream ends without any content', async () => {
    const { controller, response, saveAssistantMsg, stream } = setup();
    await start(controller, response);

    stream.emit('end');
    await tick();

    expect(saveAssistantMsg).not.toHaveBeenCalled();
    expect(response.text).not.toContain('event: error');
    expect(response.writableEnded).toBe(true);
  });

  it('tells the client when the assistant answer could not be saved', async () => {
    const saveAssistantMsg = jest.fn().mockRejectedValue(new Error('database unavailable'));
    const { controller, response, stream } = setup(saveAssistantMsg);
    await start(controller, response);

    stream.emit('data', modelChunk('完整回答'));
    stream.emit('end');
    await tick();

    expect(saveAssistantMsg).toHaveBeenCalledTimes(1);
    expect(parseErrorEvents(response.text)).toEqual([
      expect.objectContaining({ code: 'save_failed', message: expect.stringContaining('未能保存') })
    ]);
    expect(response.writableEnded).toBe(true);
  });

  it('returns a classified JSON error when the stream fails before sending headers', async () => {
    const { controller, response, saveAssistantMsg, stream } = setup();
    await start(controller, response);

    stream.emit('error', Object.assign(new Error('connect ETIMEDOUT'), { code: 'ETIMEDOUT' }));
    await tick();

    expect((response.jsonBody as { message: string }).message).toContain('超时');
    expect(response.headers['Content-Type']).toBe('application/json; charset=utf-8');
    expect(saveAssistantMsg).not.toHaveBeenCalled();
    expect(response.writableEnded).toBe(true);
  });
});
