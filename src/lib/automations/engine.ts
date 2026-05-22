import { prisma } from "@/lib/prisma";

type ReactFlowNode = {
  id: string;
  type: string;
  data: { label: string; [key: string]: any };
};

type ReactFlowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
};

export class AutomationEngine {
  
  /**
   * Inicia a execução de um fluxo para um Lead específico.
   */
  static async iniciarFluxo(fluxoId: string, leadId: string, variaveis: any = {}) {
    const execucao = await prisma.execucaoFluxo.create({
      data: {
        fluxoId,
        leadId,
        empresaId: variaveis.empresaId, // passado pelo contexto do webhook
        variaveis,
        status: "RODANDO"
      }
    });

    await this.avancarFluxo(execucao.id);
    return execucao;
  }

  /**
   * Continua a execução de um fluxo a partir do nó atual.
   */
  static async avancarFluxo(execucaoId: string) {
    let execucao = await prisma.execucaoFluxo.findUnique({
      where: { id: execucaoId },
      include: { fluxo: true, lead: true }
    });

    if (!execucao || execucao.status === "CONCLUIDO" || execucao.status === "ERRO") return;

    const nodes: ReactFlowNode[] = typeof execucao.fluxo.nodes === 'string' ? JSON.parse(execucao.fluxo.nodes) : execucao.fluxo.nodes as any;
    const edges: ReactFlowEdge[] = typeof execucao.fluxo.edges === 'string' ? JSON.parse(execucao.fluxo.edges) : execucao.fluxo.edges as any;

    if (!nodes || nodes.length === 0) {
      await this.finalizar(execucaoId, "CONCLUIDO");
      return;
    }

    // Se acabou de iniciar, achar o Trigger
    let currentNodeId = execucao.nodeAtualId;
    if (!currentNodeId) {
      const triggerNode = nodes.find(n => n.type === 'trigger');
      if (!triggerNode) {
        await this.finalizar(execucaoId, "ERRO");
        console.error("Fluxo sem gatilho inicial");
        return;
      }
      currentNodeId = triggerNode.id;
      // Atualiza o banco com o primeiro nó
      await prisma.execucaoFluxo.update({ where: { id: execucaoId }, data: { nodeAtualId: currentNodeId } });
    }

    let isRunning = true;
    let fallbackCounter = 0; // Proteção contra loops infinitos

    while (isRunning && fallbackCounter < 50) {
      fallbackCounter++;
      
      const node = nodes.find(n => n.id === currentNodeId);
      if (!node) {
        await this.finalizar(execucaoId, "CONCLUIDO");
        break;
      }

      // Executa a lógica do Nó
      const actionResult = await this.executarNo(node, execucao);
      
      if (actionResult.pause) {
        // Ex: Delay pausou a execução
        isRunning = false;
        break;
      }

      // Achar próximo nó
      const nextEdge = edges.find(e => {
        if (e.source !== currentNodeId) return false;
        // Se a action retornou um handle específico (ex: condição true/false)
        if (actionResult.sourceHandle && e.sourceHandle !== actionResult.sourceHandle) return false;
        return true;
      });

      if (!nextEdge) {
        await this.finalizar(execucaoId, "CONCLUIDO");
        break;
      }

      currentNodeId = nextEdge.target;
      execucao = await prisma.execucaoFluxo.update({
        where: { id: execucaoId },
        data: { nodeAtualId: currentNodeId },
        include: { fluxo: true, lead: true }
      });
    }
  }

  /**
   * Executa a ação de um bloco individual.
   */
  private static async executarNo(node: ReactFlowNode, execucao: any): Promise<{ pause: boolean; sourceHandle?: string }> {
    const { lead } = execucao;
    const { label } = node.data;

    try {
      switch (node.type) {
        case 'trigger':
          return { pause: false };

        case 'message':
          // Substituir variáveis
          const text = label.replace(/{nome}/g, lead.nome.split(" ")[0]);
          await this.enviarMensagem(execucao.empresaId, lead, text);
          return { pause: false };

        case 'condition':
          // Exemplo básico: Se a mensagem do cliente (no contexto) contiver a palavra-chave
          const vars = execucao.variaveis as any;
          const msgCliente = (vars.textoRecebido || "").toLowerCase();
          const keyword = (label || "").toLowerCase();
          
          const conditionMet = msgCliente.includes(keyword);
          return { pause: false, sourceHandle: conditionMet ? 'true' : 'false' };

        case 'delay':
          // label = "X minutos"
          const minutosStr = label.replace(/\D/g, '');
          let minutos = parseInt(minutosStr);
          if (isNaN(minutos) || minutos <= 0) minutos = 1;

          const aguardarAte = new Date();
          aguardarAte.setMinutes(aguardarAte.getMinutes() + minutos);

          await prisma.execucaoFluxo.update({
            where: { id: execucao.id },
            data: { status: "PAUSADO", aguardandoAte: aguardarAte }
          });
          return { pause: true };

        default:
          return { pause: false };
      }
    } catch (e) {
      console.error(`Erro executando nó ${node.id}:`, e);
      return { pause: true }; // Para de avançar em caso de falha
    }
  }

  private static async finalizar(id: string, status: "CONCLUIDO" | "ERRO") {
    await prisma.execucaoFluxo.update({
      where: { id },
      data: { status, nodeAtualId: null, aguardandoAte: null }
    });
  }

  /**
   * Envia a mensagem pro WhatsApp.
   */
  private static async enviarMensagem(empresaId: string, lead: any, text: string) {
    try {
      const canal = await prisma.canalComunicacao.findFirst({
        where: { empresaId, tipo: "WHATSAPP", ativo: true }
      });

      if (!canal || !lead.telefone) return;

      let conversa = await prisma.conversa.findFirst({
        where: { empresaId, clienteContato: lead.telefone }
      });

      if (!conversa) {
        conversa = await prisma.conversa.create({
          data: { empresaId, canalId: canal.id, clienteContato: lead.telefone, clienteNome: lead.nome, leadId: lead.id }
        });
      }

      await prisma.mensagem.create({
        data: { conversaId: conversa.id, remetente: "SISTEMA", conteudo: text }
      });

      // Aqui chamariamos a Evolution API na vida real
      // await fetch("https://evo.com/...", { body: JSON.stringify({ number: lead.telefone, text }) });

    } catch (e) {
      console.error("Erro ao enviar mensagem:", e);
    }
  }
}
