<?php
declare(strict_types=1);

require_once __DIR__ . '/../env.php';
require_once __DIR__ . '/../ai/knowledge.php';

function pobj_handle_agent(array $query, array $payload): array
{
    $question = trim((string)($payload['question'] ?? ''));
    if ($question === '') {
        http_response_code(422);
        return ['error' => 'Campo "question" é obrigatório.'];
    }

    try {
        $apiKey = ai_env('OPENAI_API_KEY','');
        if ($apiKey==='') { http_response_code(500); return ['error'=>'OPENAI_API_KEY não configurada']; }
        $model  = ai_env('OPENAI_MODEL','gpt-5-mini');

        // índice da pasta de conhecimento
        $dir       = __DIR__ . '/../../docs/knowledge';
        $indexPath = __DIR__ . '/../../docs/knowledge.index.json';
        $index     = ai_build_or_load_index($dir, $indexPath);

        // retrieval
        $top = ai_retrieve_topk($question, $index, 6);
        $context = '';
        $sources = [];
        foreach ($top as $i => $hit) {
            $n = $i + 1;
            $context .= "[$n] (" . $hit['name'] . " #" . $hit['chunk_id'] . ")\n" . $hit['text'] . "\n\n";
            $sources[] = [
                'rank'=>$n,'file'=>$hit['name'],'path'=>$hit['source'],
                'chunk'=>$hit['chunk_id'],'score'=>round($hit['score'],4)
            ];
        }
        if ($context==='') $context = "Nenhum documento disponível em docs/knowledge.";

        // ===== PROMPT REFORÇADO =====
        $userName = '';
        if (!empty($payload['user_name'])) {
            $parts = preg_split('/\s+/', trim((string)$payload['user_name']));
            $userName = $parts ? $parts[0] : '';
        }

        $system = <<<SYS
Você é o **Assistente POBJ & Campanhas** para agências no Brasil.
REGRAS OBRIGATÓRIAS:
1) ESCOPO FECHADO: responda **somente** com base no conteúdo dos manuais do **POBJ** e de **Campanhas** fornecidos no *Contexto*. 
   • Se a pergunta estiver fora do escopo ou o contexto não trouxer evidência suficiente, responda **em 1 linha**:
     "Posso ajudar apenas com o POBJ e as Campanhas. Isso não está no manual. 🙂"
2) ESTILO: seja **direto ao ponto**, **nada verboso**. No máximo **2–3 frases curtas** ou **até 3 bullets** (curtos).
   • Tom simpático e animado; use **1 emoji** pertinente (no início ou fim). Evite vários emojis.
3) CITAÇÕES: quando afirmar uma regra/dado, referencie o trecho como **[arquivo #chunk]** quando isso ajudar.
4) AMBIGUIDADE: se faltar um detalhe essencial, faça **no máximo 1** pergunta de esclarecimento em 1 linha.
5) PERSONALIZAÇÃO: se for informado "Usuário: NOME", **cumprimente pelo primeiro nome** no início (ex.: "Oi, Ana!").
6) Português do Brasil, claro e profissional.
SYS;

        $saud = $userName ? "Usuário: {$userName}" : "Usuário: (não informado)";
        $user = "{$saud}\n".
                "Pergunta: {$question}\n\n".
                "Contexto (trechos recuperados dos manuais):\n{$context}";
        // ============================

        // temperature condicional (mini/nano não aceitam)
        $supportsTemp = !preg_match('/\b(gpt-5-mini|gpt-5-nano)\b/i', $model);
        $payloadOpenAI = [
            'model' => $model,
            'messages' => [
                ['role'=>'system','content'=>$system],
                ['role'=>'user','content'=>$user],
            ],
        ];
        if ($supportsTemp) $payloadOpenAI['temperature'] = 0.2;

        $resp = ai_http_post_json(
            'https://api.openai.com/v1/chat/completions',
            ['Authorization: Bearer '.$apiKey],
            $payloadOpenAI
        );

        $answer = trim((string)($resp['choices'][0]['message']['content'] ?? ''));

        return ['answer'=>$answer, 'sources'=>$sources, 'model'=>$model];

    } catch (Throwable $err) {
        http_response_code(500);
        $message = trim($err->getMessage()) ?: 'Falha interna ao processar a pergunta.';
        return ['error'=>$message];
    }
}
