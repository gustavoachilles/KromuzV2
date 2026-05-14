"use client";

import React, { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain, Zap, Trophy, DollarSign, Building2,
  Search, Loader2, CheckCircle, Clock, Activity, Medal, FileText
} from "lucide-react";
import { toast } from "sonner";

const BENEFICIOS = ["INSS", "LOAS", "SERVIDOR", "SIAPE", "MILITAR", "FGTS"];
const ESPECIES_INSS = [
  { label: "21 - Aposentadoria por tempo de contribuição", value: "21" },
  { label: "32 - Aposentadoria por invalidez",             value: "32" },
  { label: "41 - Aposentadoria por idade",                 value: "41" },
  { label: "57 - Aposentadoria especial",                  value: "57" },
  { label: "87 - BPC LOAS deficiente",                     value: "87" },
  { label: "88 - BPC LOAS idoso",                          value: "88" },
  { label: "92 - Aposentadoria por invalidez acidentária", value: "92" },
  { label: "93 - Pensão por morte",                        value: "93" },
];

const fmtBRL = (v: number) => v > 0 ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";

function ScoreBadge({ score }: { score: number }) {
  const cor = score >= 80 ? "bg-green-100 text-green-700 border-green-200"
    : score >= 60 ? "bg-yellow-100 text-yellow-700 border-yellow-200"
    : "bg-red-100 text-red-700 border-red-200";
  return <Badge className={`${cor} font-bold text-sm px-2.5`}>{score}</Badge>;
}

function MedalhaRanking({ posicao }: { posicao: number }) {
  if (posicao === 1) return <Medal className="w-5 h-5 text-yellow-500" />;
  if (posicao === 2) return <Medal className="w-5 h-5 text-slate-400" />;
  if (posicao === 3) return <Medal className="w-5 h-5 text-amber-600" />;
  return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{posicao}º</span>;
}

function BarraScore({ score }: { score: number }) {
  const cor = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : "bg-red-400";
  return (
    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${cor} rounded-full transition-all`} style={{ width: `${score}%` }} />
    </div>
  );
}

export default function CreditBrainClient({ empresaId }: { empresaId: string }) {
  const [form, setForm] = useState({
    beneficio_tipo: "INSS", especie_beneficio: "", idade: "",
    valor_beneficio: "", margem_disponivel: "", valor_solicitado: "", prazo_desejado: "",
    cliente_nome: "",
  });
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [importandoHiscon, setImportandoHiscon] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const handleHiscon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImportandoHiscon(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const arrayBuffer = ev.target?.result as ArrayBuffer;
        const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));

        const res = await fetch("/api/simulador/extrair", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdfBase64: base64 }),
        });
        
        const data = await res.json();
        if (res.ok && data.cliente) {
          setForm(f => ({
            ...f,
            margem_disponivel: data.cliente.margemLivre?.toString() || f.margem_disponivel,
            especie_beneficio: data.cliente.especie?.toString() || f.especie_beneficio,
            beneficio_tipo: "INSS"
          }));
          toast.success("HISCON processado! Preencha a Idade manualmente.");
        } else {
          toast.error(data.error || "Erro ao ler HISCON");
        }
      } catch (err: any) {
        toast.error("Falha na importação");
      } finally {
        setImportandoHiscon(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };


  const simular = async () => {
    if (!empresaId) {
      toast.error("Empresa não identificada.");
      return;
    }
    if (!form.beneficio_tipo || !form.idade) {
      toast.error("Preencha tipo de benefício e idade"); return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/simulador/enquadramento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId: empresaId,
          beneficioTipo: form.beneficio_tipo,
          especieBeneficio: form.especie_beneficio || null,
          idade: parseInt(form.idade),
          valorBeneficio: form.valor_beneficio ? parseFloat(form.valor_beneficio) : null,
          margemDisponivel: form.margem_disponivel ? parseFloat(form.margem_disponivel) : null,
          valorSolicitado: form.valor_solicitado ? parseFloat(form.valor_solicitado) : null,
          prazoDesejado: form.prazo_desejado ? parseInt(form.prazo_desejado) : null,
          salvarSimulacao: true,
          clienteNome: form.cliente_nome || null,
        }),
      });

      const data = await res.json();
      
      if (res.ok && data.sucesso) {
        setResultado(data);
        toast.success(`${data.total_elegiveis} banco(s) elegível(is) encontrado(s)`);
      } else {
        toast.error(data?.error || "Erro na simulação");
      }
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const limpar = () => { 
    setResultado(null); 
    setForm(f => ({ ...f, idade: "", valor_beneficio: "", margem_disponivel: "", valor_solicitado: "", prazo_desejado: "", cliente_nome: "" })); 
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="simular">
        <TabsList>
          <TabsTrigger value="simular" className="gap-1.5"><Zap className="w-3.5 h-3.5" /> Simular</TabsTrigger>
          <TabsTrigger value="historico" className="gap-1.5"><Clock className="w-3.5 h-3.5" /> Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="simular" className="pt-4 space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Formulário */}
            <div className="md:col-span-1">
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Search className="w-4 h-4" /> Dados do Cliente
                  </CardTitle>
                  <button 
                    onClick={() => fileRef.current?.click()}
                    disabled={importandoHiscon}
                    className="text-xs bg-brand/10 text-brand px-2 py-1 rounded-md font-medium hover:opacity-80 transition flex items-center gap-1"
                  >
                    {importandoHiscon ? <Loader2 className="w-3 h-3 animate-spin"/> : <FileText className="w-3 h-3"/>}
                    Preencher via HISCON
                  </button>
                  <input type="file" accept=".pdf" className="hidden" ref={fileRef} onChange={handleHiscon} />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-2 rounded-md mb-2">
                    Aviso: O Extrato INSS não possui Idade ou Data de Nascimento. Preencha manualmente.
                  </div>
                  <div>
                    <Label className="text-xs">Nome do Cliente</Label>
                    <Input className="mt-1" placeholder="Opcional" value={form.cliente_nome}
                      onChange={e => setForm(f => ({ ...f, cliente_nome: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Tipo de Benefício *</Label>
                    <Select value={form.beneficio_tipo}
                      onValueChange={(v: string) => setForm(f => ({ ...f, beneficio_tipo: v, especie_beneficio: "" }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{BENEFICIOS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {form.beneficio_tipo === "INSS" && (
                    <div>
                      <Label className="text-xs">Espécie do Benefício</Label>
                      <Select value={form.especie_beneficio}
                        onValueChange={(v: string) => setForm(f => ({ ...f, especie_beneficio: v }))}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {ESPECIES_INSS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs">Idade *</Label>
                    <Input type="number" className="mt-1" placeholder="Ex: 65" value={form.idade}
                      onChange={e => setForm(f => ({ ...f, idade: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Margem Disponível (R$)</Label>
                    <Input type="number" className="mt-1" placeholder="Ex: 800" value={form.margem_disponivel}
                      onChange={e => setForm(f => ({ ...f, margem_disponivel: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Valor Desejado (R$)</Label>
                    <Input type="number" className="mt-1" placeholder="Ex: 10000" value={form.valor_solicitado}
                      onChange={e => setForm(f => ({ ...f, valor_solicitado: e.target.value }))} />
                  </div>
                   <Button className="w-full gap-2 bg-brand hover:opacity-90 text-zinc-950 font-bold" onClick={simular} disabled={loading}>
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analisando...</> : <><Brain className="w-4 h-4" /> SIMULAR</>}
                  </Button>
                  {resultado && <Button variant="ghost" className="w-full text-xs" onClick={limpar}>Limpar resultado</Button>}
                </CardContent>
              </Card>
            </div>

            {/* Resultado */}
            <div className="md:col-span-2">
              {!resultado && !loading && (
                <Card className="h-full flex items-center justify-center border-dashed bg-muted/20 min-h-[400px]">
                  <CardContent className="text-center text-muted-foreground pt-6">
                    <Brain className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="font-medium">Credit Brain aguardando</p>
                    <p className="text-sm mt-1">Preencha os dados e clique em SIMULAR</p>
                  </CardContent>
                </Card>
              )}

              {loading && (
                <Card className="h-full flex items-center justify-center min-h-[400px]">
                  <CardContent className="text-center">
                    <Brain className="w-16 h-16 mx-auto mb-4 text-brand animate-pulse" />
                    <p className="font-medium text-brand">Analisando perfil do cliente...</p>
                    <p className="text-sm text-muted-foreground mt-1">Consultando regras de bancos...</p>
                  </CardContent>
                </Card>
              )}

              {resultado && !loading && (
                <div className="space-y-4">
                  {/* KPIs resultado */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                       { label: "Bancos Elegíveis", value: resultado.total_elegiveis, icon: Building2, color: "text-green-600", bg: "bg-green-50" },
                      { label: "Melhor Score",  value: `${resultado.melhor_score}%`, icon: Trophy,    color: "text-yellow-600", bg: "bg-yellow-50" },
                      { label: "Valor Máximo",  value: fmtBRL(resultado.valor_maximo_aprovavel), icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50" },
                      { label: "Score Médio",   value: `${resultado.score_medio}%`, icon: Activity,  color: "text-brand", bg: "bg-brand/10" },
                    ].map(k => (
                      <Card key={k.label} className={`${k.bg} border-0 shadow-sm`}>
                        <CardContent className="p-4 text-center">
                          <k.icon className={`w-6 h-6 mx-auto mb-2 ${k.color}`} />
                          <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                          <p className="text-xs text-muted-foreground font-medium mt-1">{k.label}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Ranking */}
                  {resultado.ranking?.length > 0 ? (
                    <Card className="shadow-sm">
                      <CardHeader className="pb-2 bg-slate-50 border-b">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-yellow-500" /> Ranking de Bancos Aprovadores
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="divide-y">
                          {resultado.ranking.map((b: any) => (
                            <div key={`${b.banco_nome}-${b.tipo_produto}`}
                              className={`p-4 hover:bg-slate-50 transition-colors ${b.posicao === 1 ? "bg-yellow-50/30" : ""}`}>
                              <div className="flex flex-col sm:flex-row items-start gap-4">
                                <MedalhaRanking posicao={b.posicao} />
                                <div className="flex-1 min-w-0 w-full">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-sm">{b.banco_nome}</span>
                                    {b.tipo_produto && <Badge variant="outline" className="text-xs">{b.tipo_produto}</Badge>}
                                  </div>
                                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground bg-white border p-2 rounded-md">
                                    {b.taxa_media && <span>Taxa: <strong>{b.taxa_media}%/mês</strong></span>}
                                    {b.prazo_maximo && <span>Prazo: <strong>{b.prazo_maximo}x</strong></span>}
                                    {b.parcela_estimada > 0 && <span>Parcela est.: <strong>{fmtBRL(b.parcela_estimada)}</strong></span>}
                                  </div>
                                  {b.explicacao_score?.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {b.explicacao_score.map((exp: string, ei: number) => (
                                        <span key={ei} className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-100 rounded-full px-2 py-0.5">
                                          <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />{exp}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="sm:text-right shrink-0 space-y-2 flex sm:block items-center justify-between w-full sm:w-auto mt-3 sm:mt-0">
                                  <div className="flex items-center gap-2 justify-end">
                                    <BarraScore score={b.score_aprovacao} />
                                    <ScoreBadge score={b.score_aprovacao} />
                                  </div>
                                  {b.valor_maximo > 0 && (
                                    <div className="text-right">
                                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Libera aprox.</p>
                                      <p className="text-sm font-bold text-green-600">{fmtBRL(b.valor_maximo)}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card><CardContent className="py-10 text-center text-muted-foreground">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p>Nenhum banco elegível para este perfil</p>
                      <p className="text-xs mt-1">Verifique as regras de crédito e tabelas cadastradas</p>
                    </CardContent></Card>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="historico" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" /> Histórico de Simulações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-12">
                 <p>O histórico de simulações aparecerá aqui.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
