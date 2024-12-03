const express = require("express");
const cors = require("cors");
const axios = require("axios");
const https = require("https");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Adicione o CORS
app.use(
  cors({
    origin: "https://areacliente.oneelevadores.com.br", // Origem permitida (substitua pela origem do front-end)
    methods: ["GET", "POST"], // Métodos HTTP permitidos
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"], // Cabeçalhos permitidos
    credentials: true, // Permite cookies
  })
);

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

    if (!jsessionId) {
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

    const boletoDownload = await axios.get(boletoUrl, {
      responseType: "stream", // Receber como stream para enviar direto ao cliente
      headers: {
        Cookie: `JSESSIONID=${jsessionId}`,
      },
      httpsAgent: agent,
    });

    // Etapa 4: Retornar o arquivo como resposta
    res.setHeader("Content-Type", "application/pdf");
    boletoDownload.data.pipe(res); // Enviar o stream do PDF como resposta
  } catch (error) {
    console.error("Erro ao buscar boleto:", error.message);
    res.status(500).json({ error: error.message || "Erro ao buscar boleto" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
