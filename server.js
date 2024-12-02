const express = require("express");
const axios = require("axios");
const https = require("https");
const app = express();
const PORT = process.env.PORT || 3000;
require("dotenv").config();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Bem-vindo ao servidor Node.js!");
});

app.post("/api/boletos", async (req, res) => {
  try {
    const usuario = process.env.API_USUARIO;
    const senha = process.env.API_SENHA;

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
    console.log("SESSIONID", jsessionId);

    if (!jsessionId) {
      console.error(
        "Erro ao obter o JSESSIONID. Resposta completa da autenticação:",
        authResponse.data
      );
      throw new Error("Erro ao autenticar: JSESSIONID não encontrado.");
    }

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

    const chaveArquivo = boletoResponse.data?.responseBody?.boleto?.valor;

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
