import type { Message } from "../../types/chat.d";
import { readStream } from "../../utils/stream";

export const requestChat = async (messages: Message[], onDelta) => {
  const res = await fetch("http://localhost:3000/api/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) throw new Error("请求失败");
  const reader = res.body!.getReader();
  await readStream(reader, onDelta);
};
