# Atlas Cultural da Lusofonia

Protótipo de site educativo para mapear países de língua portuguesa e organizar referências culturais por país.

O projeto usa HTML, CSS, JavaScript puro, Leaflet.js e dados em JSON. Não usa backend nem banco de dados nesta primeira versão.

## O Que O Site Faz

- Mostra um mapa-múndi interativo.
- Destaca países lusófonos no mapa.
- Exibe uma barra lateral com busca e lista de países.
- Permite clicar em um país para ver informações culturais.
- Organiza conteúdos em abas:
  - Informações
  - Literatura
  - Música
  - Mídia
- Permite que o público clique em cartões culturais para abrir uma janela com mais detalhes.
- Permite que o aprendiz adicione novos conteúdos nas abas e exporte um JSON atualizado no modo de aprendizagem.

## Estrutura

```text
atlas-lusofonia/
  index.html
  style.css
  script.js
  README.md
  data/
    paises.json
```

## Como Rodar Localmente

Você pode abrir o arquivo `index.html` diretamente no navegador.

Para uma experiência mais próxima da publicação online, rode um servidor local dentro da pasta do projeto:

```bash
python -m http.server 8000
```

Depois abra:

```text
http://localhost:8000
```

## Modo Público E Modo Aprendiz

No endereço público normal, a área do aprendiz não aparece. O visitante vê apenas o mapa, as abas e os cartões clicáveis.

Para abrir a versão de aprendizagem, acrescente isto ao final do endereço:

```text
?modo=aprendiz
```

Exemplo local:

```text
http://localhost:8000?modo=aprendiz
```

Exemplo na Vercel:

```text
https://seu-site.vercel.app?modo=aprendiz
```

## Como Usar Como Aprendiz

1. Clique em um país no mapa ou na lista lateral.
2. Escolha uma aba cultural: Literatura, Música ou Mídia.
3. Para editar um conteúdo existente, clique em "Editar" no cartão.
4. Para criar um novo conteúdo, use a área "Área do aprendiz".
5. Preencha:
   - nome;
   - descrição curta;
   - texto maior;
   - URL da foto ou imagem;
   - link externo;
   - título do link.
6. Clique em "Adicionar à aba" ou "Salvar edição".

O conteúdo novo ou editado aparece imediatamente no site, mas fica salvo apenas no navegador usado.

## Como Salvar As Contribuições

Depois de adicionar conteúdos, clique em:

```text
Exportar JSON atualizado
```

O site vai baixar um arquivo chamado:

```text
paises-atualizado.json
```

Para transformar essas contribuições em conteúdo oficial do site, substitua o arquivo:

```text
data/paises.json
```

pelo conteúdo exportado.

## Como Adicionar Conteúdo Manualmente No JSON

Abra `data/paises.json`, escolha um país e adicione itens na aba desejada.

Exemplo em `literatura`:

```json
{
  "nome": "Carolina Maria de Jesus",
  "descricao": "Escritora brasileira conhecida por Quarto de Despejo.",
  "texto": "Carolina Maria de Jesus foi uma autora fundamental para a literatura brasileira, especialmente por sua escrita sobre vida urbana, pobreza e memória.",
  "imagem": "https://exemplo.com/carolina.jpg",
  "link": "https://www.youtube.com/results?search_query=Carolina+Maria+de+Jesus"
}
```

Cada item deve ficar entre chaves `{ }`. Entre um item e outro, use vírgula. O último item da lista não precisa de vírgula depois.

## Como Subir Para O GitHub

Dentro da pasta do projeto:

```bash
git init
git add .
git commit -m "Cria Atlas Cultural da Lusofonia"
git branch -M main
git remote add origin URL_DO_REPOSITORIO
git push -u origin main
```

Troque `URL_DO_REPOSITORIO` pela URL do seu repositório no GitHub.

## Como Publicar Na Vercel

1. Acesse a Vercel.
2. Clique em "Add New Project".
3. Escolha o repositório do GitHub.
4. Publique sem configurar backend.

Como o projeto é estático, não precisa de comando de build.

## Limitações Desta Versão

- As contribuições e edições feitas pela área do aprendiz ficam salvas apenas no navegador.
- No modo público, visitantes não alteram o conteúdo oficial do site.
- Para guardar contribuições de várias pessoas online, será necessário usar um suporte externo no futuro, como Google Sheets, Airtable, Supabase ou Firebase.
- Ainda não há login, moderação ou painel administrativo.

## Próximos Passos Possíveis

- Criar perfis mais completos para escritores, músicos e artistas.
- Adicionar upload real de imagens.
- Criar uma página pública para cada item cultural.
- Conectar com Google Sheets ou banco de dados.
- Criar login para aprendizes e curadores.
