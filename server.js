const express = require("express");
const axios = require("axios");
const https = require("https");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Bem-vindo ao servidor Node.js!");
});

app.post("/api/boletos", async (req, res) => {
  try {
    console.log("Requisição POST recebida para /api/boletos");
    const { usuario, senha } = req.body;
    console.log(`Usuário recebido: ${usuario}`);
    console.log(`Senha recebida: ${senha}`);

    const authResponse = await axios.post(
      "https://one.nuvemdatacom.com.br:9491/mge/service.sbr?serviceName=MobileLoginSP.login&outputType=json",
      {
        serviceName: "MobileLoginSP.login",
        requestBody: {
          NOMUSU: { $: usuario },
          INTERNO: { $: senha },
          KEEPCONNECTED: { $: "S" },
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    const jsessionId = authResponse.data?.responseBody?.jsessionid?.$;

    if (!jsessionId) {
      console.error(
        "Erro ao obter o JSESSIONID. Resposta completa da autenticação:",
        authResponse.data
      );
      throw new Error("Erro ao autenticar: JSESSIONID não encontrado.");
    }

    console.log("JSESSIONID obtido com sucesso:", jsessionId);

    const agent = new https.Agent({
      rejectUnauthorized: false,
    });

    const boletoResponse = await axios.post(
      `https://one.nuvemdatacom.com.br:9491/mge/service.sbr?serviceName=BoletoSP.buildPreVisualizacao&mgeSession=${jsessionId}&outputType=json`,
      {
        serviceName: "BoletoSP.buildPreVisualizacao",
        requestBody: {
          configBoleto: {
            agrupamentoBoleto: "1",
            ordenacaoParceiro: 1,
            dupRenegociadas: false,
            gerarNumeroBoleto: true,
            codigoConta: 22,
            codBco: 33,
            codEmp: 13,
            nossoNumComecando: "0",
            alterarTipoTitulo: false,
            tipoTitulo: "4",
            bcoIgualConta: false,
            empIgualConta: false,
            reimprimir: true,
            tipoReimpressao: "S",
            registraConta: false,
            codCtaBcoInt: 22,
            boletoRapido: false,
            boletoVendaMais: false,
            telaImpressaoBoleto: true,
            boleto: {
              binicial: "",
              bfinal: "",
            },
            titulo: [
              {
                $: 442210,
              },
            ],
          },
        },
      },
      {
        headers: {
          Cookie: `JSESSIONID=${jsessionId}`,
          "Content-Type": "application/json",
          Accept: "*/*",
          "User-Agent": "PostmanRuntime/7.43.0",
        },
      }
    );

    console.log(
      "Resposta da API de boletos recebida:",
      JSON.stringify(boletoResponse.data, null, 2)
    );

    const chaveArquivo = boletoResponse.data?.responseBody?.boleto?.valor;
    console.log("Chave do boleto obtida:", chaveArquivo);

    if (!chaveArquivo) {
      console.error(
        "Chave do boleto não encontrada. Resposta da API de boletos:",
        boletoResponse.data
      );
      return res.status(400).json({ error: "Chave do boleto não encontrada." });
    }

    const boletoUrl = `https://one.nuvemdatacom.com.br:9491/mge/visualizadorArquivos.mge?download=S&chaveArquivo=${chaveArquivo}`;
    console.log("URL do boleto gerada:", boletoUrl);

    res.json({ boletoUrl });
  } catch (error) {
    console.error("Erro ao buscar boletos:", error.message);
    res.status(500).json({ error: error.message || "Erro ao buscar boletos" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
