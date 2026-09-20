export const EPIC_EXPORT_SCRIPT = `(async () => {
  const BASE = "https://accounts.epicgames.com/account/v2/payment/ajaxGetOrderHistory?count=100&sortDir=DESC&sortBy=DATE&locale=en-US";
  let allGames = [];
  let nextPageToken = "";
  let page = 1;
  console.log("Iniciando exportação da biblioteca da Epic...");
  while (true) {
      const url = nextPageToken ? \`\${BASE}&nextPageToken=\${encodeURIComponent(nextPageToken)}\` : BASE;
      console.log(\`Buscando página \${page}...\`);
      const response = await fetch(url, {
          method: "GET",
          credentials: "include",
          headers: { "Accept": "application/json", "X-Requested-With": "XMLHttpRequest" }
      });
      if (!response.ok) throw new Error(\`Erro HTTP \${response.status}: \${response.statusText}\`);
      const data = await response.json();
      if (!data.orders) break;
      for (const order of data.orders) {
          if (!order.items) continue;
          for (const item of order.items) {
              if (item.description) allGames.push(item.description);
          }
      }
      nextPageToken = data.nextPageToken;
      if (!nextPageToken) break;
      page++;
  }
  const uniqueGames = [...new Set(allGames)].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  const txt = uniqueGames.join("\\n");
  const txtBlob = new Blob([txt], { type: "text/plain;charset=utf-8" });
  const txtLink = document.createElement("a");
  txtLink.href = URL.createObjectURL(txtBlob);
  txtLink.download = "EpicGamesLibrary.txt";
  txtLink.click();
  console.log(\`Exportação concluída! \${uniqueGames.length} jogos baixados.\`);
})();`;

export function parseEpicContent(rawText: string): string[] {
  const titles = rawText.split(/\r?\n/).flatMap((rawLine) => {
    let line = rawLine.trim();
    if (!line || line.toLowerCase() === 'game' || line.toLowerCase() === '"game"') return [];
    if (line.startsWith('"') && line.endsWith('"') && line.length > 1) {
      line = line.slice(1, -1).replace(/""/g, '"').trim();
    }
    return line ? [line] : [];
  });

  return [...new Set(titles)];
}
