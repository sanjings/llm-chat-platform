export async function readStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: (text: string) => void,
) {
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let lastFullText = ""; // 记录上一次完整文本，用于增量计算

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // 解码并累积数据
    buffer += decoder.decode(value, { stream: true });
    // 按换行分割，处理不完整数据
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // 保留最后一行不完整数据

    for (const line of lines) {
      const trimmedLine = line.trim();
      // 1. 跳过空行、event行、id行，只处理真正的data行
      if (
        !trimmedLine ||
        trimmedLine.startsWith("event:") ||
        trimmedLine.startsWith("id:")
      ) {
        continue;
      }

      // 2. 通义千问的data行是 data:{...} 或 data: {...}，两种都兼容
      if (trimmedLine.startsWith("data:")) {
        // 3. 去掉data:前缀，不管后面有没有空格
        const jsonStr = trimmedLine.replace(/^data:\s*/, "").trim();
        if (jsonStr === "[DONE]") continue;

        try {
          const json = JSON.parse(jsonStr);
          const currentFullText = json.output?.text || "";

          // 4. 核心：只返回增量字符，实现真正逐字显示
          if (currentFullText.length > lastFullText.length) {
            const delta = currentFullText.slice(lastFullText.length);
            lastFullText = currentFullText;
            console.log("✅ 解析到增量：", delta);
            onChunk(delta); // 触发回调，更新页面
          }
        } catch (e) {
          console.error("❌ 解析失败：", line, e);
        }
      }
    }
  }
}
