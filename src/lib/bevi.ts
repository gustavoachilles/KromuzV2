/**
 * Bevi/Domus Commission Table Scraper
 * 
 * Login e scraping 100% via Puppeteer (browser headless).
 * O login do Bevi usa AJAX com base64, então chamamos fazerlogin() via JS.
 */

import puppeteer, { type Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium";

// ── Types ──────────────────────────────────────────────
export type BeviTabelaComissao = {
  codigoTabela: string;
  nomeTabela: string;
  financeira: string;
  convenio: string;
  formaContrato: string;
  prazo: number;
  taxa: number;
  coeficiente: number;
  comissaoFlat: number | null;
  comissaoRepasse: number | null;
  seguro: string | null;
  digital: boolean;
  observacoes: string | null;
};

export type BeviScraperResult = {
  success: boolean;
  tabelas: BeviTabelaComissao[];
  rawData: Record<string, string>[];
  errors: string[];
  meta: {
    loginOk: boolean;
    paginaCarregada: boolean;
    tempoTotal: number;
    filtrosUsados: Record<string, string>;
    pageTitle?: string;
    pageUrl?: string;
    debugText?: string;
  };
};

const BEVI_URL = "https://sistema.bevicred.com.br";

// ── Browser Launch ─────────────────────────────────────
async function launchBrowser(): Promise<Browser> {
  const isLocal = !process.env.AWS_LAMBDA_FUNCTION_NAME && !process.env.VERCEL;

  if (isLocal) {
    let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || "";
    
    if (!executablePath) {
      const paths = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
      ];
      for (const p of paths) {
        try {
          const fs = await import("fs");
          if (fs.existsSync(p)) { executablePath = p; break; }
        } catch { continue; }
      }
    }
    
    if (!executablePath) throw new Error("Chrome/Chromium não encontrado");

    return puppeteer.launch({
      executablePath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    });
  }

  return puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });
}

// ── Scraper Principal ──────────────────────────────────
export async function scrapeBeviTabelas(
  login: string,
  senha: string,
  senhaRelatorio: string,
  filtros?: {
    financeira?: string;
    convenio?: string;
    formaContrato?: string;
    tipoContrato?: string;
  }
): Promise<BeviScraperResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const result: BeviScraperResult = {
    success: false,
    tabelas: [],
    rawData: [],
    errors,
    meta: {
      loginOk: false,
      paginaCarregada: false,
      tempoTotal: 0,
      filtrosUsados: filtros || {},
    },
  };

  let browser: Browser | null = null;

  try {
    console.log("[Bevi] Iniciando browser...");
    browser = await launchBrowser();
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(30000);
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    );

    // Grant geolocation permission & mock coordinates (Campo Grande, MS)
    const cdpSession = await page.createCDPSession();
    await cdpSession.send("Browser.grantPermissions", {
      permissions: ["geolocation"],
      origin: BEVI_URL,
    });
    await cdpSession.send("Emulation.setGeolocationOverride", {
      latitude: -20.4697,
      longitude: -54.6201,
      accuracy: 100,
    });

    // Mock geolocation on every new document
    await page.evaluateOnNewDocument(() => {
      const mockPosition = {
        coords: {
          latitude: -20.4697,
          longitude: -54.6201,
          accuracy: 100,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      };
      
      navigator.geolocation.getCurrentPosition = (success: PositionCallback) => {
        success(mockPosition as GeolocationPosition);
      };
      navigator.geolocation.watchPosition = (success: PositionCallback) => {
        success(mockPosition as GeolocationPosition);
        return 1;
      };
    });

    // ── Step 1: Login ───────────────────────────
    console.log("[Bevi] Navegando para login...");
    await page.goto(`${BEVI_URL}/`, { waitUntil: "networkidle2" });
    await sleep(2000);

    // Fill fields
    await page.waitForSelector("#loginusr", { timeout: 10000 });
    await page.type("#loginusr", login, { delay: 30 });
    await page.type("#senha", senha, { delay: 30 });

    // Call the login function via JS (AJAX-based, not form submit)
    console.log("[Bevi] Executando fazerlogin()...");

    const loginResponse = await page.evaluate(() => {
      return new Promise<string>((resolve) => {
        // Intercept the AJAX response
        const origXhr = XMLHttpRequest.prototype.open;
        let resolved = false;

        XMLHttpRequest.prototype.open = function (method: string, url: string, ...args: any[]) {
          const origOnLoad = this.onload;
          this.addEventListener("load", function () {
            if (!resolved && (url.includes("login") || url.includes("Login"))) {
              resolved = true;
              resolve(this.responseText || "xhr-loaded");
            }
          });
          // @ts-ignore
          return origXhr.call(this, method, url, ...args);
        };

        // Also intercept fetch
        const origFetch = window.fetch;
        window.fetch = async function (...args) {
          const resp = await origFetch.apply(this, args);
          if (!resolved) {
            const url = typeof args[0] === "string" ? args[0] : "";
            if (url.includes("login")) {
              resolved = true;
              const text = await resp.clone().text();
              resolve(text);
            }
          }
          return resp;
        };

        // Call the actual login function
        try {
          (window as any).fazerlogin("N", "S");
        } catch (e: any) {
          resolve("error:" + e.message);
        }

        // Timeout fallback
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve("timeout");
          }
        }, 15000);
      });
    });

    console.log(`[Bevi] Login response: "${loginResponse.substring(0, 100)}"`);

    // Wait for redirect/navigation after login
    await sleep(3000);

    // Check current URL
    let currentUrl = page.url();
    console.log(`[Bevi] URL após login: ${currentUrl}`);

    // If still on login page but got "existe", navigate manually
    if (loginResponse.includes("existe") || loginResponse.includes("sucesso")) {
      result.meta.loginOk = true;
      
      if (currentUrl.includes("login") || currentUrl === `${BEVI_URL}/`) {
        // The AJAX set the session, try navigating
        console.log("[Bevi] Login OK via AJAX. Navegando para dashboard...");
        await page.goto(`${BEVI_URL}/app/dashboard/principal`, { 
          waitUntil: "networkidle2",
          timeout: 15000,
        }).catch(() => {});
        await sleep(2000);
        currentUrl = page.url();
        console.log(`[Bevi] URL dashboard: ${currentUrl}`);
      }
    }

    // If redirected to dashboard or any /app/ page, login worked
    if (currentUrl.includes("/app/") || currentUrl.includes("/dashboard")) {
      result.meta.loginOk = true;
    }

    if (!result.meta.loginOk) {
      errors.push(`Login falhou. Response: ${loginResponse.substring(0, 200)}`);
      result.meta.tempoTotal = Date.now() - startTime;
      return result;
    }

    console.log("[Bevi] ✅ Login confirmado!");

    // ── Step 2: Navigate to commission tables ───
    // The Bevi system may redirect to /app/senharelatorio/auth (report password gate)
    console.log("[Bevi] Navegando para tabelas de comissão...");
    await page.goto(`${BEVI_URL}/app/tabelacomissao/list`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await sleep(4000);

    let pageTitle = await page.title();
    currentUrl = page.url();

    console.log(`[Bevi] Página: "${pageTitle}" @ ${currentUrl}`);

    // Handle "Senhas de Relatórios" auth gate
    if (currentUrl.includes("senharelatorio")) {
      console.log("[Bevi] Detectada tela de autenticação de relatórios. Tratando...");

      // 1. Dismiss geolocation notice ("Ok, estou ciente")
      await page.evaluate(() => {
        const btns = document.querySelectorAll("button, a");
        for (const b of btns) {
          const text = (b.textContent || "").trim().toLowerCase();
          if (text.includes("ok, estou ciente") || text.includes("ok,")) {
            (b as HTMLElement).click();
            return;
          }
        }
      });
      await sleep(1000);

      // 2. Fill the report password
      const senhaRelatField = await page.$("#senharelatorio");
      if (senhaRelatField) {
        await senhaRelatField.click();
        await senhaRelatField.type(senhaRelatorio, { delay: 30 });
        console.log("[Bevi] Senha de relatório preenchida.");
      }
      
      await sleep(500);

      // 3. Click "Entrar" and wait for response (don't follow redirect)
      console.log("[Bevi] Clicando Entrar...");

      // Use page.waitForNavigation + click pattern
      try {
        await Promise.all([
          page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 }).catch(() => {}),
          page.evaluate(() => {
            const allButtons = document.querySelectorAll("button, a.btn");
            for (const btn of allButtons) {
              const text = (btn.textContent || "").trim();
              if (text === "Entrar" || text.toUpperCase() === "ENTRAR") {
                (btn as HTMLElement).click();
                return true;
              }
            }
            // Fallback: submit form
            const senhaField = document.getElementById("senharelatorio");
            if (senhaField) {
              const form = senhaField.closest("form");
              if (form) { form.submit(); return true; }
            }
            return false;
          }),
        ]);
      } catch {}

      await sleep(2000);
      currentUrl = page.url();
      console.log(`[Bevi] URL pós-entrar: ${currentUrl}`);

      // If we hit a chrome-error or bad redirect, navigate directly
      if (currentUrl.includes("chrome-error") || currentUrl.includes("chromewebdata") || !currentUrl.includes("bevicred")) {
        console.log("[Bevi] Redirect inválido. Navegando diretamente para tabelas...");
        await page.goto(`${BEVI_URL}/app/tabelacomissao/list`, {
          waitUntil: "networkidle2",
          timeout: 30000,
        });
        await sleep(3000);
        currentUrl = page.url();
        pageTitle = await page.title();
        console.log(`[Bevi] Após navegação direta: "${pageTitle}" @ ${currentUrl}`);
      }

      // If still on senharelatorio, check error
      if (currentUrl.includes("senharelatorio")) {
        const errorMsg = await page.evaluate(() => {
          const swal = document.querySelector(".swal2-popup, .swal2-container");
          if (swal) return swal.textContent?.trim().substring(0, 200) || "";
          const alerts = document.querySelectorAll(".alert, .text-danger");
          for (const a of alerts) {
            const t = a.textContent?.trim();
            if (t && t.length > 5) return t.substring(0, 200);
          }
          return "";
        });
        
        if (errorMsg) {
          errors.push(`Senha de relatório: ${errorMsg}`);
        }
        
        // Try navigating directly anyway
        console.log("[Bevi] Tentando navegar diretamente...");
        await page.goto(`${BEVI_URL}/app/tabelacomissao/list`, {
          waitUntil: "networkidle2",
          timeout: 30000,
        });
        await sleep(3000);
        currentUrl = page.url();
        pageTitle = await page.title();
        console.log(`[Bevi] Navegação direta: "${pageTitle}" @ ${currentUrl}`);
      }
    }

    result.meta.pageTitle = pageTitle;
    result.meta.pageUrl = currentUrl;

    // Check if session is still valid
    const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 500) || "");
    if (bodyText.includes("não efetuou o login") || bodyText.includes("processo cancelado")) {
      errors.push("Sessão inválida na página de tabelas");
      result.meta.debugText = bodyText;
      result.meta.tempoTotal = Date.now() - startTime;
      return result;
    }

    result.meta.paginaCarregada = true;

    // ── Step 3: Prepare page & select filters ───
    // Dismiss ALL overlays/popups that block interaction
    console.log("[Bevi] Fechando avisos e overlays...");
    
    // Multiple rounds of dismissal (overlays may appear sequentially)
    for (let round = 0; round < 3; round++) {
      await page.evaluate(() => {
        // Close "Não me Perturbe" overlay
        const allEls = document.querySelectorAll("button, a, div, span, input[type='button']");
        for (const el of allEls) {
          const text = (el.textContent || "").trim();
          if (
            text === "Ok, estou ciente." ||
            text === "NÃO ME PERTURBE" ||
            text === "Não me Perturbe" ||
            text === "×" || // close button
            text === "X"
          ) {
            const htmlEl = el as HTMLElement;
            if (htmlEl.offsetParent !== null && htmlEl.offsetWidth > 0) {
              htmlEl.click();
            }
          }
        }
        
        // Close modals
        document.querySelectorAll(".modal.show .close, .modal.show .btn-close, [data-dismiss='modal'], [data-bs-dismiss='modal']")
          .forEach(m => (m as HTMLElement).click());
        
        // Close sweetalert
        const swalBtns = document.querySelectorAll(".swal2-confirm, .swal2-close");
        swalBtns.forEach(b => (b as HTMLElement).click());
        
        // Close any overlay/backdrop by removing it
        document.querySelectorAll(".modal-backdrop, .swal2-backdrop-show").forEach(el => el.remove());
        
        // Hide "Não me perturbe" container if exists
        const nmpContainers = document.querySelectorAll("[id*='naoPerturbe'], [id*='naomeperturbe'], [class*='nao-perturbe'], [class*='naoperturbe']");
        nmpContainers.forEach(el => (el as HTMLElement).style.display = "none");
      });
      await sleep(1000);
    }

    // Wait for dynamic content to load
    console.log("[Bevi] Aguardando conteúdo dinâmico...");
    await sleep(3000);
    
    // Try waiting for specific elements that indicate the table page is loaded
    try {
      await page.waitForFunction(() => {
        // Wait until we see "TABELA DE COMISSIONAMENTO" or "Financeira" text
        const bodyText = document.body?.innerText || "";
        return bodyText.includes("TABELA DE COMISSIONAMENTO") || 
               bodyText.includes("Financeira") ||
               bodyText.includes("LISTAR");
      }, { timeout: 10000 });
      console.log("[Bevi] Conteúdo da tabela detectado!");
    } catch {
      console.log("[Bevi] Timeout aguardando conteúdo da tabela");
    }
    
    await sleep(2000);

    // ── Step 3b: Select filters via Bevi's custom buttons ──
    const filt = {
      financeira: filtros?.financeira || "FACTA",
      convenio: filtros?.convenio || "INSS",
      formaContrato: filtros?.formaContrato || "Novo",
      tipoContrato: filtros?.tipoContrato || "Novo",
    };

    // 3b-1: Select Financeira (e.g. FACTA FINANCEIRA)
    console.log(`[Bevi] Selecionando financeira: ${filt.financeira}...`);
    const finClicked = await page.evaluate((search: string) => {
      const btns = document.querySelectorAll("[onclick*='selecionarFinanceira']");
      for (const btn of btns) {
        const text = btn.textContent?.trim().toUpperCase() || "";
        if (text.includes(search.toUpperCase())) {
          (btn as HTMLElement).click();
          return text;
        }
      }
      return null;
    }, filt.financeira);
    console.log(`[Bevi] Financeira: ${finClicked || "NÃO ENCONTRADA"}`);
    await sleep(3000);

    // 3b-2: Select Convênio (e.g. INSS)
    console.log(`[Bevi] Selecionando convênio: ${filt.convenio}...`);
    const convClicked = await page.evaluate((search: string) => {
      const btns = document.querySelectorAll("[onclick*='detalharGrupoConvenio']");
      for (const btn of btns) {
        const text = btn.textContent?.trim().toUpperCase() || "";
        if (text.includes(search.toUpperCase())) {
          (btn as HTMLElement).click();
          return text;
        }
      }
      return null;
    }, filt.convenio);
    console.log(`[Bevi] Convênio: ${convClicked || "NÃO ENCONTRADO"}`);
    await sleep(3000);

    // After clicking INSS, sub-options may appear (Todos, specific convenios)
    // Select "Todos" if available
    // After clicking INSS group, sub-options appear with onclick="selecioneSubGrupo(this)":
    // INSS (data-value=325), TODOS (data-tipo=subGrupo, data-convenio=325, data-idsubgrupoconvenio=-1)
    // Click "TODOS" to select all INSS sub-groups
    await sleep(3000);
    
    console.log("[Bevi] Selecionando sub-grupo TODOS...");
    const subGrupoResult = await page.evaluate(() => {
      const btns = document.querySelectorAll("[onclick*='selecioneSubGrupo']");
      const options: string[] = [];
      for (const btn of btns) {
        const text = btn.textContent?.trim().toUpperCase() || "";
        options.push(text);
        if (text === "TODOS") {
          (btn as HTMLElement).click();
          return { clicked: text, options };
        }
      }
      if (btns.length > 0) {
        (btns[0] as HTMLElement).click();
        return { clicked: btns[0].textContent?.trim(), options };
      }
      return { clicked: null, options };
    });
    console.log(`[Bevi] Sub-grupo: ${subGrupoResult.clicked} (opções: ${subGrupoResult.options.join(", ")})`);

    // Wait for AJAX to load the NEXT level of options (Empréstimo Consignado, etc.)
    console.log("[Bevi] Aguardando sub-opções carregarem via AJAX...");
    await sleep(5000);
    try { await page.waitForNetworkIdle({ timeout: 10000 }); } catch {}
    await sleep(2000);

    // Check what new buttons appeared in #dadosRetornoSubGrupoConvenioNovo
    const subOptionsResult = await page.evaluate(() => {
      const container = document.querySelector("#dadosRetornoSubGrupoConvenioNovo");
      const btns = container ? container.querySelectorAll("button[onclick]") : document.querySelectorAll("[onclick*='selecioneSubGrupo']");
      const options: { text: string; onclick: string; dataValue?: string }[] = [];
      btns.forEach(btn => {
        options.push({
          text: btn.textContent?.trim() || "",
          onclick: btn.getAttribute("onclick")?.substring(0, 50) || "",
          dataValue: (btn as HTMLElement).getAttribute("data-value") || undefined,
        });
      });
      return {
        containerFound: !!container,
        containerHTML: container?.innerHTML?.substring(0, 500) || "",
        options,
      };
    });
    
    console.log(`[Bevi] Container sub-opções: ${subOptionsResult.containerFound ? "encontrado" : "não encontrado"}`);
    console.log(`[Bevi] ${subOptionsResult.options.length} opções: ${subOptionsResult.options.map(o => o.text).join(", ")}`);

    // Click "Empréstimo Consignado" or "EMPRESTIMO CONSIGNADO" if available
    if (subOptionsResult.options.length > 0) {
      const empConsClicked = await page.evaluate(() => {
        // Look in #dadosRetornoSubGrupoConvenioNovo first
        const container = document.querySelector("#dadosRetornoSubGrupoConvenioNovo");
        const btns = container ? container.querySelectorAll("button") : document.querySelectorAll("button");
        
        // Priority: "EMPRESTIMO CONSIGNADO" or "EMPRÉSTIMO CONSIGNADO"
        for (const btn of btns) {
          const text = btn.textContent?.trim().toUpperCase() || "";
          if ((text.includes("EMPRESTIMO") || text.includes("EMPRÉSTIMO")) && text.includes("CONSIGNADO")) {
            (btn as HTMLElement).click();
            return text;
          }
        }
        // Fallback: click "TODOS" if present in this level
        for (const btn of btns) {
          const text = btn.textContent?.trim().toUpperCase() || "";
          if (text === "TODOS" && btn.getAttribute("onclick")?.includes("selecion")) {
            (btn as HTMLElement).click();
            return `TODOS (fallback)`;
          }
        }
        return null;
      });
      
      if (empConsClicked) {
        console.log(`[Bevi] Sub-opção selecionada: ${empConsClicked}`);
        await sleep(5000);
        try { await page.waitForNetworkIdle({ timeout: 10000 }); } catch {}
        await sleep(2000);
        
        // There might be yet another level - check and click NOVO or first option
        const nextLevel = await page.evaluate(() => {
          const container = document.querySelector("#dadosRetornoSubGrupoConvenioNovo");
          const btns = container ? container.querySelectorAll("button[onclick]") : [];
          return Array.from(btns).map(b => b.textContent?.trim() || "");
        });
        
        if (nextLevel.length > 0) {
          console.log(`[Bevi] Próximo nível: ${nextLevel.join(", ")}`);
          // Click the appropriate option
          await page.evaluate(() => {
            const container = document.querySelector("#dadosRetornoSubGrupoConvenioNovo");
            const btns = container ? container.querySelectorAll("button[onclick]") : [];
            for (const btn of btns) {
              const text = btn.textContent?.trim().toUpperCase() || "";
              if (text === "NOVO" || text.includes("TODOS")) {
                (btn as HTMLElement).click();
                return;
              }
            }
            if (btns.length > 0) (btns[0] as HTMLElement).click();
          });
          await sleep(3000);
        }
      }
    }

    // NOW select Forma Contrato = NOVO (after convênio flow is complete)
    console.log(`[Bevi] Selecionando forma contrato: NOVO...`);
    const novoClicked = await page.evaluate((search: string) => {
      const btns = document.querySelectorAll("[onclick*='selecionarFormaContrato']");
      for (const btn of btns) {
        const text = btn.textContent?.trim().toUpperCase() || "";
        if (text === search.toUpperCase()) {
          (btn as HTMLElement).click();
          return text;
        }
      }
      return null;
    }, filt.formaContrato);
    console.log(`[Bevi] Forma contrato: ${novoClicked || "NÃO ENCONTRADO"}`);
    await sleep(2000);

    // Verify the critical form fields
    const formState = await page.evaluate(() => {
      const grupo = (document.querySelector("#tabelaComissaoForm #grupo") as HTMLInputElement)?.value || "";
      const financeira = (document.querySelector("#tabelaComissaoForm #financeira") as HTMLInputElement)?.value || "";
      const formacontrato = (document.querySelector("#tabelaComissaoForm #formacontrato") as HTMLInputElement)?.value || "";
      return { grupo, financeira, formacontrato };
    });
    console.log(`[Bevi] Form: #grupo="${formState.grupo}", #financeira="${formState.financeira}", #formacontrato="${formState.formacontrato}"`);

    // If #grupo still empty, force set it
    if (!formState.grupo) {
      console.log("[Bevi] #grupo vazio. Forçando valor...");
      await page.evaluate(() => {
        const g = document.querySelector("#tabelaComissaoForm #grupo") as HTMLInputElement;
        if (g) g.value = "325"; // INSS convênio for FACTA (from data-convenio=325)
      });
    }

    // ── Step 4: Click LISTAR ────────────────────
    console.log("[Bevi] Clicando LISTAR...");

    // Dismiss any sweetalert/modal that might be showing
    await page.evaluate(() => {
      const swal = document.querySelector(".swal2-confirm");
      if (swal) (swal as HTMLElement).click();
    });
    await sleep(500);

    // Call the JS function directly
    await page.evaluate(() => {
      (window as any).listarTabelaComissionamento();
    });

    console.log("[Bevi] listarTabelaComissionamento() chamada");

    // Wait for AJAX results
    await sleep(5000);
    try { await page.waitForNetworkIdle({ timeout: 15000 }); } catch {}
    await sleep(3000);

    // Check for error modals
    const errorModal = await page.evaluate(() => {
      const swal = document.querySelector(".swal2-popup");
      if (swal) {
        const text = swal.textContent?.trim() || "";
        const confirm = swal.querySelector(".swal2-confirm");
        if (confirm) (confirm as HTMLElement).click();
        return text.substring(0, 200);
      }
    });
    if (errorModal) {
      console.log(`[Bevi] Modal: ${errorModal}`);
      if (errorModal.includes("necessário informar")) {
        errors.push(`Filtros insuficientes: ${errorModal}`);
      }
    }

    // ── Step 5: Extract table data ──────────────
    console.log("[Bevi] Aguardando resultados AJAX...");

    // Wait for loading indicator to disappear and content to appear
    try {
      await page.waitForFunction(() => {
        const template = document.querySelector(".templateDadosComissao");
        if (template && template.innerHTML.trim().length > 100) return true;
        const tables = document.querySelectorAll("table");
        for (const t of tables) {
          if (t.querySelectorAll("tbody tr").length > 0) return true;
        }
        return false;
      }, { timeout: 30000 });
      console.log("[Bevi] ✅ Conteúdo de resultados detectado!");
    } catch {
      console.log("[Bevi] ⚠️ Timeout aguardando resultados (30s)");
    }

    await sleep(3000);

    // Debug: check templateDadosComissao content
    const templateContent = await page.evaluate(() => {
      const template = document.querySelector(".templateDadosComissao");
      if (template) {
        const html = template.innerHTML;
        const text = template.textContent?.trim() || "";
        return {
          htmlLen: html.length,
          textLen: text.length,
          textPreview: text.substring(0, 500),
          tables: template.querySelectorAll("table").length,
          rows: template.querySelectorAll("tr").length,
          cards: template.querySelectorAll(".card, .panel, [class*='comiss']").length,
        };
      }
      return null;
    });
    
    if (templateContent) {
      console.log(`[Bevi] .templateDadosComissao: ${templateContent.htmlLen} chars HTML, ${templateContent.textLen} chars text`);
      console.log(`  Tables: ${templateContent.tables}, Rows: ${templateContent.rows}, Cards: ${templateContent.cards}`);
      console.log(`  Preview: ${templateContent.textPreview.substring(0, 200)}`);
    } else {
      console.log("[Bevi] .templateDadosComissao não encontrado");
    }

    console.log("[Bevi] Extraindo dados...");

    const extracted = await page.evaluate(() => {
      const bodyText = document.body?.innerText || "";
      const rows: Record<string, string>[] = [];

      // Method 1: HTML tables (DataTables)
      const tables = document.querySelectorAll("table");
      for (const table of tables) {
        const ths = table.querySelectorAll("thead th, thead td, tr:first-child th");
        const headers = Array.from(ths).map((th, i) =>
          th.textContent?.trim().replace(/\s+/g, " ").substring(0, 50) || `col_${i}`
        );
        if (headers.length < 3) continue;

        const dataRows = table.querySelectorAll("tbody tr");
        const allTrs = dataRows.length > 0 ? dataRows : table.querySelectorAll("tr");
        for (let i = (dataRows.length > 0 ? 0 : 1); i < allTrs.length; i++) {
          const cells = allTrs[i].querySelectorAll("td");
          if (cells.length < 3) continue;
          const row: Record<string, string> = {};
          Array.from(cells).forEach((c, j) => {
            row[headers[j] || `col_${j}`] = c.textContent?.trim() || "";
          });
          rows.push(row);
        }
      }

      // Method 2: Check .templateDadosComissao for custom rendered content
      if (rows.length === 0) {
        const template = document.querySelector(".templateDadosComissao");
        if (template) {
          // Look for tables inside template
          const tplTables = template.querySelectorAll("table");
          for (const table of tplTables) {
            const trs = table.querySelectorAll("tr");
            for (const tr of trs) {
              const cells = tr.querySelectorAll("td, th");
              if (cells.length >= 2) {
                const row: Record<string, string> = {};
                Array.from(cells).forEach((c, j) => {
                  row[`col_${j}`] = c.textContent?.trim() || "";
                });
                rows.push(row);
              }
            }
          }
          
          // If still empty, try getting raw text blocks
          if (rows.length === 0 && template.textContent && template.textContent.trim().length > 50) {
            rows.push({ _source: "templateDadosComissao", _text: template.textContent.trim().substring(0, 3000) });
          }
        }
      }

      // Method 3: Look for dynamically rendered result divs
      if (rows.length === 0) {
        const resultContainers = document.querySelectorAll("#resultado, #resultadoTabela, [id*='resultado'], .dataTables_wrapper");
        for (const container of resultContainers) {
          const text = container.textContent?.trim();
          if (text && text.length > 50) {
            rows.push({ _source: "container", _id: (container as HTMLElement).id, _text: text.substring(0, 2000) });
          }
        }
      }

      return {
        rows,
        tableCount: tables.length,
        bodyLength: bodyText.length,
        bodyPreview: bodyText.substring(0, 2000),
      };
    });

    console.log(`[Bevi] ${extracted.rows.length} linhas de ${extracted.tableCount} tabelas`);
    result.rawData = extracted.rows;
    result.meta.debugText = extracted.bodyPreview.substring(0, 500);

    if (extracted.rows.length === 0) {
      console.log("[Bevi] Preview da página:");
      console.log(extracted.bodyPreview.substring(0, 800));
      errors.push(`Nenhum dado na tabela. ${extracted.tableCount} tabelas HTML encontradas.`);
    }

    // Parse rows
    result.tabelas = extracted.rows
      .map(row => parseBeviRow(row, filt))
      .filter((t): t is BeviTabelaComissao => t !== null);

    if (result.tabelas.length === 0 && extracted.rows.length > 0) {
      errors.push(`${extracted.rows.length} linhas brutas, mas parsing falhou. Headers: ${Object.keys(extracted.rows[0]).join(", ")}`);
      console.log("[Bevi] Amostra primeira linha:", JSON.stringify(extracted.rows[0]));
    }

    result.success = result.tabelas.length > 0 || extracted.rows.length > 0;
    console.log(`[Bevi] ✅ Resultado: ${result.tabelas.length} tabelas parseadas, ${extracted.rows.length} brutas`);

  } catch (err: any) {
    errors.push(`Erro: ${err.message}`);
    console.error("[Bevi] Erro:", err);
  } finally {
    if (browser) await browser.close().catch(() => {});
    result.meta.tempoTotal = Date.now() - startTime;
  }

  return result;
}

// ── Helpers ────────────────────────────────────────────

function parseBeviRow(
  row: Record<string, string>,
  filtros: Record<string, string>
): BeviTabelaComissao | null {
  try {
    const keys = Object.keys(row);
    const vals = Object.values(row);
    
    // Bevi's table headers are shifted by 1 position due to a merged first TH
    // The actual column mapping by position is:
    // [0] Código tabela, [1] Cód Banco, [2] Data alteração, [3] Nome/Descrição da tabela
    // [4] Taxa convênio, [5] Taxa, [6] Prazo, [7] Comissão Total
    // [8] Comissão Banco, [9] Comissão BEVICRED, [10] Inicial, [11] Final
    // [12] À Vista, [13] Antecipado, [14] Diferido Total

    const findVal = (patterns: string[]): string => {
      for (const p of patterns) {
        const k = keys.find(k => k.toLowerCase().includes(p.toLowerCase()));
        if (k && row[k]) return row[k];
      }
      return "";
    };

    // Position-based extraction (reliable for Bevi)
    const codigoTabela = vals[0] || "";
    const codBanco = vals[1] || "";
    const dataAlteracao = vals[2] || "";
    const nomeTabela = vals[3] || ""; // "FACTA FINANCEIRA INSS NOVO SMART 4 90D - 66141 108X"
    const taxa1 = vals[4] || "0";
    const taxa2 = vals[5] || "0";
    const prazoStr = vals[6] || "0";
    const comissaoTotal = vals[7] || "0";
    const comissaoBanco = vals[8] || "0";
    const comissaoBevi = vals[9] || "0";
    const comInicial = vals[10] || "0";
    const comFinal = vals[11] || "0";
    const comAVista = vals[12] || "0";
    const comAntecipado = vals[13] || "0";
    const comDiferido = vals[14] || "0";

    if (!codigoTabela) return null;

    const num = (s: string): number => {
      if (!s) return 0;
      return parseFloat(s.replace(/[^\d.,\-]/g, "").replace(",", ".")) || 0;
    };

    // Determine if digital based on table name
    const isDigital = nomeTabela.toUpperCase().includes("DIGITAL") || 
                      nomeTabela.toUpperCase().includes("SMART");

    return {
      codigoTabela: codigoTabela.trim(),
      nomeTabela: nomeTabela.trim() || codigoTabela.trim(),
      financeira: filtros.financeira || "",
      convenio: filtros.convenio || "",
      formaContrato: filtros.formaContrato || "",
      prazo: parseInt(prazoStr) || 0,
      taxa: num(taxa1) || num(taxa2),
      coeficiente: 0, // Bevi doesn't show coeficiente in this table
      comissaoFlat: num(comAVista) || num(comissaoTotal),
      comissaoRepasse: num(comDiferido) || null,
      seguro: null,
      digital: isDigital,
      observacoes: codBanco ? `Cód.Banco:${codBanco} | Data:${dataAlteracao} | ComBanco:${comissaoBanco} | ComBevi:${comissaoBevi}` : null,
    };
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
