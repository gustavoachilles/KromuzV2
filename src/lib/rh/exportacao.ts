// Utilitário de exportação de dados — CSV e impressão
// Usado por Espelho de Ponto, Holerites, Rescisão, etc.

export function exportarCSV(nomeArquivo: string, linhas: (string | number)[][]): void {
  const csv = linhas.map(l => l.map(c => {
    const s = String(c);
    // Escapar campos com ; ou "
    if (s.includes(";") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }).join(";")).join("\n");

  const bom = "\uFEFF"; // BOM para Excel reconhecer UTF-8
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nomeArquivo}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportarJSON(nomeArquivo: string, dados: unknown): void {
  const json = JSON.stringify(dados, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nomeArquivo}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Gera uma tabela HTML e abre em nova janela para impressão (gera PDF via browser)
export function imprimirRelatorio(titulo: string, conteudoHTML: string): void {
  const janela = window.open("", "_blank");
  if (!janela) return;

  janela.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${titulo} — KROMUZ</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20mm; color: #1a1a1a; font-size: 11px; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        h2 { font-size: 14px; margin-top: 16px; margin-bottom: 8px; color: #555; }
        .header { border-bottom: 2px solid #1a1a1a; padding-bottom: 8px; margin-bottom: 16px; }
        .meta { color: #666; font-size: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0; }
        th, td { padding: 4px 8px; text-align: left; border-bottom: 1px solid #e5e5e5; }
        th { background: #f5f5f5; font-weight: 600; font-size: 10px; text-transform: uppercase; }
        td { font-size: 11px; }
        .right { text-align: right; }
        .bold { font-weight: 700; }
        .total-row { border-top: 2px solid #1a1a1a; font-weight: 700; }
        .footer { margin-top: 24px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 9px; color: #999; }
        .negative { color: #dc2626; }
        @media print { body { padding: 10mm; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${titulo}</h1>
        <p class="meta">Gerado em ${new Date().toLocaleString("pt-BR")} — KROMUZ CRM</p>
      </div>
      ${conteudoHTML}
      <div class="footer">
        <p>Documento gerado automaticamente pelo sistema KROMUZ. Este relatório é uma projeção e não substitui a folha de pagamento oficial.</p>
      </div>
    </body>
    </html>
  `);
  janela.document.close();
  setTimeout(() => janela.print(), 300);
}

// Helper: gerar espelho de ponto para impressão
export function gerarEspelhoPontoHTML(
  funcionario: { nome: string; cargoFuncao?: string | null; horasDiarias: number },
  mes: string,
  registros: { data: string; entrada?: string | null; saidaAlmoco?: string | null; retornoAlmoco?: string | null; saida?: string | null; horasTrabalhadas?: number | null; horasExtras?: number | null; falta: boolean }[],
  totais: { totalHoras: number; totalExtras: number; faltas: number }
): string {
  const fmtH = (iso?: string | null) => iso ? new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—";
  const fmtD = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });

  const rows = registros.map(r => `
    <tr${r.falta ? ' style="background:#fef2f2"' : ""}>
      <td>${fmtD(r.data)}</td>
      <td>${fmtH(r.entrada)}</td>
      <td>${fmtH(r.saidaAlmoco)}</td>
      <td>${fmtH(r.retornoAlmoco)}</td>
      <td>${fmtH(r.saida)}</td>
      <td class="right">${r.horasTrabalhadas ? r.horasTrabalhadas.toFixed(1) + "h" : "—"}</td>
      <td class="right">${(r.horasExtras || 0) > 0 ? "+" + r.horasExtras!.toFixed(1) + "h" : "—"}</td>
      <td>${r.falta ? "FALTA" : r.saida ? "✓" : r.entrada ? "..." : "—"}</td>
    </tr>
  `).join("");

  return `
    <h2>${funcionario.nome} — ${funcionario.cargoFuncao || "Sem cargo"}</h2>
    <p class="meta">Jornada: ${funcionario.horasDiarias}h/dia · Referência: ${mes}</p>
    <table>
      <thead><tr><th>Data</th><th>Entrada</th><th>Almoço</th><th>Retorno</th><th>Saída</th><th class="right">Horas</th><th class="right">Extras</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="5">TOTAL</td>
          <td class="right">${totais.totalHoras.toFixed(1)}h</td>
          <td class="right">${totais.totalExtras > 0 ? "+" + totais.totalExtras.toFixed(1) + "h" : "—"}</td>
          <td>${totais.faltas > 0 ? totais.faltas + " falta(s)" : "—"}</td>
        </tr>
      </tfoot>
    </table>
  `;
}

// Helper: gerar holerite para impressão
export function gerarHoleriteHTML(
  funcionario: { nome: string; cpf: string; cargoFuncao?: string | null },
  mes: string,
  proventos: { label: string; valor: number }[],
  descontos: { label: string; valor: number }[],
  totalBruto: number,
  totalDescontos: number,
  totalLiquido: number
): string {
  const fmtM = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const provRows = proventos.filter(p => p.valor > 0).map(p => `<tr><td>${p.label}</td><td class="right">${fmtM(p.valor)}</td></tr>`).join("");
  const descRows = descontos.filter(d => d.valor > 0).map(d => `<tr><td>${d.label}</td><td class="right negative">−${fmtM(d.valor)}</td></tr>`).join("");

  return `
    <h2>Holerite — ${funcionario.nome}</h2>
    <p class="meta">CPF: ${funcionario.cpf} · Cargo: ${funcionario.cargoFuncao || "—"} · Referência: ${mes}</p>
    <table>
      <thead><tr><th colspan="2">PROVENTOS</th></tr></thead>
      <tbody>${provRows}
        <tr class="total-row"><td>Total Proventos</td><td class="right">${fmtM(totalBruto)}</td></tr>
      </tbody>
    </table>
    <table>
      <thead><tr><th colspan="2">DESCONTOS</th></tr></thead>
      <tbody>${descRows}
        <tr class="total-row"><td>Total Descontos</td><td class="right negative">−${fmtM(totalDescontos)}</td></tr>
      </tbody>
    </table>
    <table>
      <tbody><tr class="total-row" style="font-size:14px"><td>SALÁRIO LÍQUIDO</td><td class="right bold">${fmtM(totalLiquido)}</td></tr></tbody>
    </table>
  `;
}
