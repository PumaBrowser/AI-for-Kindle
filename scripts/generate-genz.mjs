import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  ...readdirSync(root)
    .filter((file) => file.endsWith('.html'))
    .sort(),
  ...readdirSync(path.join(root, 'chapters'))
    .filter((file) => file.endsWith('.html'))
    .sort()
    .map((file) => path.join('chapters', file)),
];

function buildGenZPage(html, rel) {
  let output = translateHtml(html);
  output = output.replace(/<html lang="en">/, '<html lang="en" class="genz-static">');
  output = output.replace(/<title>(.*?)<\/title>/, '<title>$1 — Gen Z Edition</title>');
  output = output.replace(
    /(<meta\s+name="description"\s+content=")([^"]*)(")/,
    (_, start, content, end) => `${start}${escapeAttribute(translatePlainText(content))}${end}`
  );
  output = rewriteStaticAssets(output, rel);
  output = rewriteGenZControl(output, rel);
  output = rewriteInternalLinks(output, rel);
  return output;
}

function translateHtml(html) {
  const tokens = html.split(/(<[^>]+>)/g);
  const tagStack = [];
  const classStack = [];

  return tokens.map((token) => {
    if (!token) return token;
    if (token.startsWith('<')) {
      trackTag(token, tagStack, classStack);
      return token;
    }
    if (isSkipped(tagStack, classStack)) return token;
    return translatePlainText(token);
  }).join('');
}

function trackTag(token, tagStack, classStack) {
  const close = token.match(/^<\/\s*([a-z0-9-]+)/i);
  if (close) {
    const name = close[1].toLowerCase();
    const idx = tagStack.lastIndexOf(name);
    if (idx !== -1) {
      tagStack.splice(idx);
      classStack.splice(idx);
    }
    return;
  }

  const open = token.match(/^<\s*([a-z0-9-]+)/i);
  if (!open || /\/\s*>$/.test(token) || /^<!/.test(token)) return;

  tagStack.push(open[1].toLowerCase());
  classStack.push(getClassNames(token));
}

function getClassNames(token) {
  const match = token.match(/\sclass="([^"]*)"/i);
  return match ? match[1].split(/\s+/).filter(Boolean) : [];
}

function isSkipped(tagStack, classStack) {
  const skippedTags = new Set(['code', 'pre', 'kbd', 'script', 'style', 'svg', 'canvas']);
  if (tagStack.some((tag) => skippedTags.has(tag))) return true;

  const skippedClasses = new Set(['chapter-meta', 'chapter-navigation', 'sources-list', 'controls']);
  return classStack.some((classes) => classes.some((className) => skippedClasses.has(className)));
}

function translatePlainText(text) {
  if (!text.trim()) return text;

  const leading = text.match(/^\s*/)[0];
  const trailing = text.match(/\s*$/)[0];
  const content = text.trim();
  const exact = exactTextTranslations.get(content) || normalizedTextTranslations.get(normalizeWhitespace(content));
  const translated = exact || translateWithPhraseRules(content);
  return `${leading}${translated}${trailing}`;
}

const exactTextTranslations = new Map([
  ['Learn Modern AI', 'Modern AI, but make it make sense'],
  ['Learn Modern AI — Kindle Reader Edition', 'Modern AI, but make it make sense — Kindle Reader Edition'],
  ['Glossary & Concept Index — AI 101 Guide', 'Glossary & Concept Index — AI 101 Guide'],
  ['Single-Page Edition — AI 101 Guide', 'Single-Page Edition — AI 101 Guide'],
  ['A high-contrast guide and lightweight decision game for learning the systems behind modern AI: transformers, RAG, MoE, diffusion, agents, reasoning, and physical AI.', 'A crisp, high-contrast guide plus a quick decision game for getting the AI stack: transformers, RAG, MoE, diffusion, agents, reasoning, and physical AI.'],
  ['A high-contrast guide and lightweight decision game for learning the systems behind modern AI: transformers, RAG, MoE, diffusion, agents, reasoning, physical AI, and production evals.', 'A crisp, high-contrast guide plus a quick decision game for getting the AI stack: transformers, RAG, MoE, diffusion, agents, reasoning, physical AI, and production evals.'],
  ['A lightweight, high-contrast, and up-to-date guide to the core ideas and advancements behind modern AI models, from Transformers and RAG to agents, evals, and production safety. Built for Kindle and e-ink reading.', 'A lightweight, high-contrast guide to the core ideas behind modern AI models, from Transformers and RAG to agents, evals, and production safety. Built for Kindle and e-ink reading.'],
  ['Start the Game', 'Start the Quest'],
  ['Read the Guide', 'Read the Lore'],
  ['Open Glossary', 'Open Glossary'],
  ['Single-Page Edition', 'Single-Page Edition'],
  ['Understanding Modern AI', 'Modern AI, decoded'],
  ['A lightweight, high-contrast, and up-to-date guide to the core ideas and advancements behind modern AI models (Transformers, LLMs, MoE, RAG, Agents). Built for Kindle and e-ink reading.', 'A lightweight, high-contrast guide to the core ideas behind modern AI models: Transformers, LLMs, MoE, RAG, and agents. Built for Kindle and e-ink reading.'],
  ['Artificial Intelligence has moved at a breakneck speed since the introduction of the Transformer architecture. This site explains the key engineering ideas behind modern models without the math-heavy clutter, updated for the 2026 shift toward reasoning models, agentic workflows, long-context systems, efficient open-weight models, and physical AI.', 'AI has been moving absurdly fast since the Transformer architecture dropped. This site breaks down the big engineering ideas without math-heavy clutter, updated for the 2026 shift toward reasoning models, agentic workflows, long-context systems, efficient open-weight models, and physical AI.'],
  ['Artificial Intelligence has moved at a breakneck speed since the introduction of the Transformer architecture. This site explains the important engineering ideas behind modern models without the math-heavy clutter, updated for the 2026 shift toward reasoning models, agentic workflows, long-context systems, efficient open-weight models, and physical AI.', 'AI has been moving absurdly fast since the Transformer architecture dropped. This site breaks down the big engineering ideas without math-heavy clutter, updated for the 2026 shift toward reasoning models, agentic workflows, long-context systems, efficient open-weight models, and physical AI.'],
  ['Artificial Intelligence has moved at a breakneck speed since the introduction of the Transformer', 'AI has been moving absurdly fast since the Transformer'],
  ['architecture. This site explains the important engineering ideas behind modern models without the math-heavy clutter, updated for the 2026 shift toward reasoning models, agentic workflows, long-context systems, efficient open-weight models, and physical AI.', 'architecture dropped. This site breaks down the big engineering ideas without math-heavy clutter, updated for the 2026 shift toward reasoning models, agentic workflows, long-context systems, efficient open-weight models, and physical AI.'],
  ['Read the chapters in order or play', 'Read the chapters in order, or run'],
  ['AI Systems Quest', 'AI Systems Quest'],
  [', a compact scenario game where each choice tests whether you know when to use retrieval, attention, sparse experts, tool calls, or extra test-time compute. Both paths are optimized for Kindle and other e-ink displays.', ', a compact scenario game where every choice checks whether you know when to use retrieval, attention, sparse experts, tool calls, or extra test-time compute. Both paths are Kindle and e-ink friendly.'],
  [', a compact scenario game where each choice tests whether you know when to use retrieval, attention, sparse experts, tool calls, extra test-time compute, or production evaluation. Both paths are optimized for Kindle and other e-ink displays.', ', a compact scenario game where every choice checks whether you know when to use retrieval, attention, sparse experts, tool calls, extra test-time compute, or production evals. Both paths are Kindle and e-ink friendly.'],
  ['Reading progress', 'Reading progress'],
  ['Track Your Chapters', 'Track your chapters'],
  ['Mark chapters complete as you read. Progress stays on this device and works without an account.', 'Mark chapters complete as you read. Progress stays on this device, no account needed.'],
  ['Reference Tools', 'Reference tools'],
  ['Glossary & Concept Index', 'Glossary & Concept Index'],
  ['Quick definitions for the terms used across the guide.', 'Quick definitions for terms used across the guide.'],
  ['A complete printable version assembled from the canonical chapters.', 'A complete printable version assembled from the canonical chapters.'],
  ['Understand self-attention, the Query-Key-Value mechanism, and how it replaced recurrent networks to form the bedrock of generative AI.', 'Get self-attention, the Query-Key-Value mechanism, and how it replaced recurrent networks to become the foundation of generative AI.'],
  ['Understand self-attention, the Query-Key-Value mechanism, and how it', 'Get self-attention, the Query-Key-Value mechanism, and how it'],
  ['replaced recurrent networks to form the bedrock of generative AI.', 'replaced recurrent networks to become the foundation of generative AI.'],
  ['Deep dive into pre-training, fine-tuning, and alignment mechanisms like RLHF and DPO that make AI models helpful and controllable.', 'Lock in on pre-training, fine-tuning, and alignment mechanisms like RLHF and DPO that make AI models useful, safer, and controllable.'],
  ['Deep dive into pre-training, fine-tuning, and alignment mechanisms', 'Lock in on pre-training, fine-tuning, and alignment mechanisms'],
  ['like RLHF and DPO that make AI models helpful and controllable.', 'like RLHF and DPO that make AI models useful, safer, and controllable.'],
  ['Explore how models fetch real-time data using Vector Databases, semantic search, and the mechanics behind ultra-long context windows.', 'See how models pull fresh data with vector databases, semantic search, and ultra-long context windows.'],
  ['Explore how models fetch real-time data using Vector Databases,', 'See how models pull fresh data with vector databases,'],
  ['semantic search, and the mechanics behind ultra-long context windows.', 'semantic search, and ultra-long context windows.'],
  ['How Mixture of Experts (MoE) keeps models fast by only activating subset networks, and how quantization compresses parameters for consumer hardware.', 'How Mixture of Experts (MoE) keeps models fast by activating only the experts it needs, while quantization squeezes parameters onto consumer hardware.'],
  ['How Mixture of Experts (MoE) keeps models fast by only activating', 'How Mixture of Experts (MoE) keeps models fast by activating only'],
  ['subset networks, and how quantization compresses parameters for consumer hardware.', 'the experts it needs, while quantization squeezes parameters onto consumer hardware.'],
  ['Learn how diffusion models generate images and videos by systematically removing random noise, and how Latent Diffusion speeds this up.', 'See how diffusion models cook up images and videos by stripping away random noise, and how latent diffusion makes the loop faster.'],
  ['Learn how diffusion models generate images and videos by', 'See how diffusion models cook up images and videos by'],
  ['systematically removing random noise, and how Latent Diffusion speeds this up.', 'stripping away random noise, and how latent diffusion makes the whole loop faster.'],
  ['Step into loop-based reasoning, tool usage (function calling), and System 2 thinking paradigms where models reason before responding.', 'Get the agent loop: reasoning, tool use (function calling), and System 2 patterns where models think before they answer.'],
  ['Step into loop-based reasoning, tool usage (function calling), and', 'Get the agent loop: reasoning, tool use (function calling), and'],
  ['System 2 thinking paradigms where models reason before responding.', 'System 2 patterns where models think before they answer.'],
  ['Analyze native multimodality, synthetic data constraints, and the next physical frontiers for AI integration.', 'Vibe-check native multimodality, synthetic data limits, and the next physical frontiers for AI.'],
  ['Analyze native multimodality, synthetic data constraints, and the', 'Vibe-check native multimodality, synthetic data limits, and the'],
  ['next physical frontiers for AI integration.', 'next physical frontiers for AI.'],
  ['Evaluation, Safety & Production AI', 'Evaluation, Safety & Production AI'],
  ['Learn how teams test AI systems before launch: eval sets, groundedness checks, prompt-injection defenses, observability, and human review loops.', 'See how teams test AI systems before launch: eval sets, groundedness checks, prompt-injection defenses, observability, and human review loops.'],

  ['Interactive review', 'Interactive vibe check'],
  ['Build a reliable AI product by choosing the right system design move for each scenario. Every round maps back to a chapter, and every interaction is plain HTML for fast Kindle refresh.', 'Build a reliable AI product by picking the right system-design move for each scenario. Every round maps back to a chapter, and the whole thing stays plain HTML so Kindle refresh stays snappy.'],
  ['System Health', 'System Vibe'],
  ['Loading scenario', 'Loading the scenario'],
  ['The game will load when JavaScript is available.', 'The quest loads when JavaScript is on.'],
  ['Review the matching chapter', 'Recheck the matching chapter'],
  ['Next Round', 'Next Round'],
  ['Restart', 'Run It Back'],
  ['Kindle Performance Notes', 'Kindle Performance Receipts'],
  ['No canvas, WebGL, external fonts, images, timers, audio, or network calls.', 'No canvas, WebGL, external fonts, images, timers, audio, or network calls. It stays lightweight.'],
  ['Only one scenario is rendered at a time to keep the DOM small.', 'Only one scenario renders at a time, keeping the DOM tiny.'],
  ['Kindle mode disables animation and keeps every control as a large high-contrast tap target.', 'Kindle mode cuts animation and keeps every control big, clear, and high contrast.'],
  ['JavaScript is off', 'JavaScript is off'],
  ['The game needs JavaScript for scoring. You can still read the full guide from the', 'The game needs JavaScript for scoring. You can still read the full guide from the'],
  ['table of contents', 'table of contents'],

  ['The Transformer Core', 'The Transformer Core'],
  ['The Core Breakthrough: Self-Attention', 'The Core Glow-Up: Self-Attention'],
  ['Key Concept: The Query-Key-Value (QKV) Analogy', 'Key Concept: Query-Key-Value (QKV), no mystery'],
  ['Multi-Head Attention', 'Multi-Head Attention: more angles at once'],
  ['Positional Encoding', 'Positional Encoding: giving words coordinates'],
  ['Encoder vs. Decoder Architectures', 'Encoder vs. Decoder Architectures'],
  ['Before 2017, natural language processing (NLP) models read text like humans do: one word at a time, from left to right. These models, known as Recurrent Neural Networks (RNNs) and Long Short-Term Memory (LSTM) networks, kept a running "mental state" that updated with each new word. While intuitive, this approach had a catastrophic bottleneck: it could not be parallelized. Because you needed the state of word', 'Before 2017, natural language processing (NLP) models read text the slow way: one word at a time, left to right. Recurrent Neural Networks (RNNs) and Long Short-Term Memory (LSTM) networks kept a running "mental state" that updated with each new word. Sounds sensible, but the bottleneck was brutal: it could not parallelize. Because you needed the state of word'],
  ['to compute the state of word', 'to compute word'],
  [', GPUs could not process entire blocks of text simultaneously.', ', GPUs could not process whole text blocks at the same time.'],
  ['Then came the landmark paper,', 'Then the landmark paper landed:'],
  [', which introduced the', ', introducing the'],
  ['. The Transformer discarded recurrence entirely, opting to process all words in a sequence at the exact same time. To do this, it relied on a mathematical shortcut called', '. The Transformer dropped recurrence entirely and processed all words in a sequence at the same time. The trick was a mathematical shortcut called'],
  ['Self-attention allows a model to look at a specific word and determine which other words in the sentence are most relevant to it, regardless of how far apart they are. Consider this example:', 'Self-attention lets a model look at one word and figure out which other words matter most, even if they are far apart. Example:'],
  ['How does the model know that the first "bank" refers to a financial institution, while the second "bank" refers to the edge of a river? In an RNN, by the time the model reached the end of the sentence, the context of "bank robber" might have faded. In a Transformer, the first "bank" is compared to all other words in the sentence concurrently, finding a strong mathematical connection to "robber." The second "bank" finds a connection to "river." The model dynamically contextualizes each word based on its surroundings.', 'How does the model know the first "bank" means a financial institution, while the second means the edge of a river? In an RNN, the "bank robber" context might fade by the end. In a Transformer, the first "bank" gets compared with every other word at once and links strongly to "robber." The second "bank" links to "river." The model gives every word context from its surroundings in real time.'],
  ['To compute attention, the Transformer assigns three vectors to every single word:', 'To compute attention, the Transformer gives every word three vectors:'],
  ['What the word is looking for (e.g., "I am a pronoun, where is my noun?").', 'What the word is looking for (for example, "I am a pronoun; where is my noun?").'],
  ['What the word represents or offers (e.g., "I am a noun, I describe a person").', 'What the word offers (for example, "I am a noun, I describe a person").'],
  ['The actual content of the word (the semantic meaning).', 'The actual content of the word: its meaning.'],
  ['The model multiplies the Query vector of a word by the Key vectors of all other words. The higher the score, the more attention that word gets. The final representation is a weighted sum of the Value vectors based on these attention scores.', 'The model compares a word\'s Query vector against every other word\'s Key vectors. Higher score means more attention. The final representation is a weighted mix of Value vectors based on those scores.'],
  ['Instead of doing this attention calculation once, the Transformer does it multiple times in parallel. Each calculation is called an', 'Instead of doing the attention calculation once, the Transformer runs it several times in parallel. Each run is an'],
  ['. This is known as', '. That is'],
  ['By using multiple heads, the model can look at different aspects of the text at the same time. For example:', 'With multiple heads, the model can inspect different parts of meaning at the same time:'],
  ['might focus on grammatical relationships (finding the verb for each noun).', 'might track grammar relationships, like which verb belongs to which noun.'],
  ['might focus on coreference resolution (matching "he" or "it" to the correct entity).', 'might resolve references, like matching "he" or "it" to the right entity.'],
  ['might focus on physical proximity (local descriptors like adjectives).', 'might watch local details, like nearby adjectives.'],
  ['Combined, these heads build a highly dimensional and accurate understanding of language.', 'Together, the heads build a richer, more accurate language representation.'],
  ['Since a Transformer processes all words simultaneously, it has no natural understanding of order. To a pure attention mechanism, "The dog bit the man" and "The man bit the dog" look identical because the words are the same.', 'Because a Transformer processes every word at once, it does not automatically know order. To pure attention, "The dog bit the man" and "The man bit the dog" look the same because the words match.'],
  ['To fix this, the Transformer uses', 'The fix is'],
  ['—a set of mathematical values added to each word\'s embedding that act as a coordinate. These coordinates tell the model exactly where each word sits in the sentence, allowing it to preserve the structural grammar of the text.', ': mathematical values added to each word embedding that act like coordinates. They tell the model where each word sits, preserving the sentence structure.'],
  ['The original Transformer consisted of two halves: an', 'The original Transformer had two halves: an'],
  ['(which reads and understands text) and a', '(reads and understands text) and a'],
  ['(which writes new text). Depending on the task, modern advancements have divided these into three variants:', '(writes new text). Modern systems split these into three main variants:'],
  ['Excellent for understanding, classifying, and extracting information from text. They look in both directions (left and right) simultaneously.', 'Great for understanding, classifying, and extracting information from text. They look both left and right at the same time.'],
  ['Excellent for generating text. They are autoregressive, meaning they generate one word at a time, looking only at past words (left-to-right masking) to predict the next word.', 'Great for generating text. They are autoregressive, meaning they produce one word at a time and only look backward to predict the next token.'],
  ['Often used for translation or summarization, where an input sequence is processed entirely, and a brand new output sequence is generated.', 'Often used for translation or summarization: read the whole input, then generate a new output.'],
  ['Many frontier text-first Large Language Models (LLMs) use', 'Many frontier text-first LLMs use'],
  [', optimized for generating text by predicting the next token with massive efficiency.', ', optimized for generating text by predicting the next token efficiently.'],

  ['LLM Training & Alignment', 'LLM Training & Alignment'],
  ['Phase 1: Pre-training (Creating the "Base Model")', 'Phase 1: Pre-training, aka the base model era'],
  ['Phase 2: Supervised Fine-Tuning (Creating the "Instruct Model")', 'Phase 2: Supervised Fine-Tuning, aka making it follow directions'],
  ['Phase 3: Alignment (RLHF and DPO)', 'Phase 3: Alignment with RLHF and DPO'],
  ['Key Concept: Kaplan vs. Chinchilla Scaling Laws', 'Key Concept: Kaplan vs. Chinchilla scaling laws'],
  ['Creating a modern AI assistant like ChatGPT or Gemini is not a single-step process. It requires taking raw, chaotic web data and refining it through multiple training stages. The journey from raw math to a helpful assistant is divided into three major milestones:', 'Cooking up a modern AI assistant like ChatGPT or Gemini is not one step. It starts with chaotic web-scale data, then refines it through several training stages. The arc from raw math to useful assistant has three big milestones:'],
  ['The foundation of any LLM is the pre-trained base model. During this stage, the model is fed petabytes of raw text from books, articles, code repositories, and web pages. The training objective is simple:', 'Every LLM starts with a pre-trained base model. At this stage, the model gets petabytes of raw text from books, articles, code repositories, and web pages. The training objective is simple:'],
  ['The model calculates probability distributions over its entire vocabulary and predicts "mat" (or "sofa", "bed", etc.). By repeating this trillions of times across vast supercomputer clusters, the model builds a rich internal map of language, grammar, reasoning patterns, and encyclopedic facts. However, a base model is not an assistant; it is a text completer. If you ask a base model', 'The model calculates probabilities across its vocabulary and predicts "mat" (or "sofa", "bed", etc.). Do that trillions of times on supercomputer clusters, and the model builds an internal map of language, grammar, reasoning patterns, and facts. But a base model is not an assistant; it is a text completer. If you ask it'],
  ['it might reply with a second question:', 'it might continue the pattern with another prompt:'],
  ['because it is mimicking lists of recipes found on the internet.', 'because it is mimicking recipe lists from the internet.'],
  ['To turn a text completer into an interactive assistant, engineers perform', 'To turn a text completer into an assistant, engineers run'],
  ['. In this phase, the base model is trained on a curated dataset of high-quality conversational prompts and responses, written by human experts.', '. In this phase, the base model trains on curated prompt-response examples written by human experts.'],
  ['A typical training sample looks like:', 'A typical training sample looks like:'],
  ['By training on tens of thousands of these conversational examples, the model learns the "instruct" behavior: it recognizes when it is being asked a question and understands that it must respond with helpful answers, adopting a conversational and polite tone.', 'After tens of thousands of these examples, the model learns "instruct" behavior: recognize the user request, answer directly, and keep the tone conversational.'],
  ['Even after SFT, a model can still produce toxic, biased, incorrect, or unhelpful output. SFT only teaches the model to imitate the training dialogues. To ensure the model is helpful, honest, and harmless, engineers "align" it with human preferences using two primary techniques:', 'Even after SFT, a model can still produce toxic, biased, wrong, or useless output. SFT teaches imitation; alignment teaches preference. Engineers align models with human preferences using two main techniques:'],
  ['RLHF works by using a grading system. The process involves three steps:', 'RLHF is basically a grading loop with three steps:'],
  ['The model generates multiple candidate answers to a prompt.', 'The model generates several possible answers to a prompt.'],
  ['Human evaluators rate these candidate answers from best to worst. A separate neural network—the', 'Human evaluators rank those answers from best to worst. A separate neural network, the'],
  ['—is trained to predict what score a human would give to any given response.', ', learns to predict what score a human would give.'],
  ['Using an RL algorithm (typically PPO), the LLM\'s parameters are updated to maximize the score predicted by the Reward Model. Responses that humans like are rewarded, and disliked responses are penalized.', 'Using an RL algorithm, usually PPO, the LLM updates its parameters to maximize the Reward Model score. Human-approved answers get boosted; disliked answers get pushed down.'],
  ['While RLHF is highly effective, it is notoriously unstable, expensive, and complex to train because it requires maintaining multiple models simultaneously (the LLM, the Reward Model, and reference models).', 'RLHF works, but it is famously unstable, expensive, and messy because you have to juggle the LLM, Reward Model, and reference models at the same time.'],
  ['In 2023, researchers introduced', 'In 2023, researchers introduced'],
  ['. DPO bypasses the reward model entirely. It mathematically proves that you can optimize the LLM policy directly using a dataset of paired choices: a prompt, a', '. DPO skips the reward model entirely. It shows you can optimize the LLM directly from paired choices: a prompt, a'],
  ['response, and a', 'response, and a'],
  ['response. DPO adjusts the weights so that the probability of the chosen response increases relative to the rejected response, creating a much simpler, faster, and more stable alignment loop.', 'response. DPO adjusts the weights so the chosen response becomes more likely than the rejected one. Same alignment goal, cleaner loop.'],
  ['How do we make models smarter? For a long time, the industry followed', 'How do models get smarter? For a long time, the industry followed'],
  ['(2020), which suggested that parameter size was the single most important factor—urging engineers to build larger models, even if they couldn\'t afford to train them on more data.', '(2020), which made parameter count look like the main lever. That pushed teams toward bigger models, even when they did not have enough data to train them properly.'],
  ['In 2022, DeepMind published the', 'In 2022, DeepMind published the'],
  ['. They proved that for optimal performance, parameter count and training data (tokens) should scale in equal proportion. Most models were actually', '. The result: for optimal performance, parameter count and training tokens should scale together. Many models were actually'],
  ['on too little data. This shifted the industry toward training smaller, highly efficient models (like LLaMA or Mistral) for much longer on high-quality tokens, making them far cheaper to run on standard hardware.', 'on too little data. The industry shifted toward smaller, stronger models trained longer on high-quality tokens, like LLaMA and Mistral, which are much cheaper to run on standard hardware.'],

  ['RAG & Context Windows', 'RAG & Context Windows'],
  ['The Limitation of Parametric Memory', 'Why parametric memory gets exposed'],
  ['Retrieval-Augmented Generation (RAG)', 'Retrieval-Augmented Generation (RAG)'],
  ['How the RAG Pipeline Works', 'How the RAG pipeline actually works'],
  ['The Evolution of Context Windows', 'Context windows leveled up'],
  ['The "Needle in a Haystack" Test', 'The "Needle in a Haystack" test'],
  ['An AI model has two kinds of memory. The first is', 'An AI model has two kinds of memory. First:'],
  ['—information baked directly into the model\'s weights during training. The second is', ', information baked into model weights during training. Second:'],
  ['—the space available in the immediate input prompt, known as the', ', the space available in the current prompt, also called the'],
  ['. To build reliable systems that do not hallucinate, engineers use these two memories in tandem through RAG and ultra-long context architectures.', '. Reliable systems use both together through RAG and long-context architecture instead of letting the model freestyle.'],
  ['Relying purely on what a model has memorized has three massive drawbacks:', 'Only trusting what the model memorized has three huge problems:'],
  ['The model only knows what existed before its training run finished.', 'The model only knows what existed before training finished.'],
  ['When asked about obscure facts, models often confidently guess, creating plausible-sounding falsehoods.', 'For obscure facts, models can confidently guess and produce plausible-sounding nonsense.'],
  ['Models cannot read your local PDFs, company emails, or secure databases.', 'Models cannot see your local PDFs, company emails, or secure databases unless you provide them.'],
  ['solves this by turning the model into an open-book test taker. Instead of answering from memory, the system searches an external database for the answer, pastes the relevant documents directly into the context window, and asks the model to read them to generate the answer.', 'solves this by making the model an open-book test taker. Instead of answering from memory, the system searches an external database, inserts the relevant docs into the context window, and asks the model to answer from that evidence.'],
  ['Large documents (like a 100-page manual) are broken down into small, digestible paragraphs (chunks).', 'Large docs, like a 100-page manual, get split into small chunks.'],
  ['An', 'An'],
  ['converts each text chunk into a string of numbers (a vector) representing its semantic meaning.', 'turns each chunk into a vector: numbers that represent meaning.'],
  ['These vectors are stored in a specialized database (like Pinecone, Chroma, or pgvector).', 'Those vectors go into a specialized database like Pinecone, Chroma, or pgvector.'],
  ['When a user asks a question, the system converts their question into a vector and finds the text chunks in the database that are mathematically closest to the question\'s meaning.', 'When the user asks a question, the system vectorizes it and finds the chunks closest in meaning.'],
  ['The system fetches those text chunks, inserts them into a prompt alongside the user\'s question, and sends it to the LLM:', 'The system fetches those chunks, puts them beside the user question, and sends the package to the LLM:'],
  ['If RAG is so powerful, why not just feed the entire database directly into the model? Historically, this was impossible because of the way attention works.', 'If RAG is that useful, why not dump the whole database into the model? Historically, attention made that impossible.'],
  ['The memory and computation cost of standard Self-Attention scales', 'Standard self-attention memory and compute scale'],
  ['($O(N^2)$) with the length of the input. If you double the length of your input, it takes four times more compute and memory to process. Early models were capped at a context window of just 2,048 tokens (roughly 1,500 words).', '($O(N^2)$) with input length. Double the input, and you need four times the compute and memory. Early models were capped around 2,048 tokens, roughly 1,500 words.'],
  ['Recent architectural and serving breakthroughs have broken this barrier. By 2026, frontier systems commonly offer hundreds of thousands to millions of tokens of working memory; OpenAI lists a 1 million token API context window for GPT-5.5, while Google\'s Gemini line has pushed long-context reasoning into mainstream multimodal products. The main pillars of this scaling are:', 'Recent architecture and serving breakthroughs broke that wall. By 2026, frontier systems commonly offer hundreds of thousands to millions of tokens of working memory; OpenAI lists a 1 million token API context window for GPT-5.5, while Google\'s Gemini line has pushed long-context reasoning into mainstream multimodal products. The big levers are:'],
  ['Introduced by Tri Dao, FlashAttention is a software-level optimization. Rather than changing the math of attention, it changes how the GPU handles memory. Standard attention writes massive intermediate tables back and forth between slow GPU High Bandwidth Memory (HBM) and fast on-chip SRAM. FlashAttention computes attention in small blocks, keeping data in the fast SRAM cache as much as possible. This reduces memory traffic by up to 20x, allowing context windows to scale dramatically without running out of GPU memory.', 'Introduced by Tri Dao, FlashAttention is a software optimization. It does not change attention math; it changes GPU memory movement. Standard attention writes huge intermediate tables between slower HBM and fast on-chip SRAM. FlashAttention computes in blocks and keeps data in SRAM as much as possible, reducing memory traffic by up to 20x and letting context windows scale.'],
  ['Older absolute positional systems could not handle context lengths longer than what they were trained on.', 'Older absolute position systems struggled with contexts longer than training length.'],
  ['represents positions by rotating the word vectors in a multi-dimensional mathematical space. Because rotation is relative, the model can understand the distance between words even if the total text length is far longer than the training parameters, allowing context window sizes to be scaled up post-training with minimal fine-tuning.', 'represents positions by rotating word vectors in a multi-dimensional space. Because the rotation is relative, the model can track word distances even when the total text is much longer than training length. That lets teams extend context windows after training with minimal fine-tuning.'],
  ['Just because a model', 'Just because a model'],
  ['accept a million tokens doesn\'t mean it is actually reading them. To evaluate long-context retrieval, researchers use the', 'accept a million tokens does not mean it is actually reading them. Researchers test this with the'],
  ['test.', 'test.'],
  ['A random, unrelated fact (the "needle") is hidden somewhere inside a massive text dump of documents (the "haystack"). The model is then asked a question that can only be answered using that specific fact. Modern models must achieve near 100% accuracy, finding the needle regardless of whether it is hidden at the beginning, middle, or end of the document stack.', 'A random fact, the "needle," gets hidden inside a massive document dump, the "haystack." The model must answer a question that depends on that exact fact. Modern models need near-perfect accuracy no matter where the needle appears.'],
  ['However, long context is not a free replacement for retrieval. Million-token prompts can still be slower, more expensive, and harder to audit than a well-built RAG pipeline. In production systems, engineers often combine both: use retrieval to select the most relevant evidence, then use a long-context model when the task requires cross-document synthesis, codebase-wide reasoning, or comparison across many artifacts.', 'Long context still is not a free RAG replacement. Million-token prompts can be slower, pricier, and harder to audit than a clean RAG pipeline. In real systems, engineers often combine both: retrieval grabs the best evidence, then long context handles cross-document synthesis, codebase-wide reasoning, or comparisons across many artifacts.'],

  ['Scaling Efficiency: MoE & Quantization', 'Scaling Efficiency: MoE & Quantization'],
  ['Mixture of Experts (MoE)', 'Mixture of Experts (MoE)'],
  ['Sparse Routing in Action', 'Sparse routing in action'],
  ['The Challenges of MoE', 'Where MoE gets messy'],
  ['Quantization', 'Quantization'],
  ['The Intuition Behind Quantization', 'Quantization intuition'],
  ['Modern Quantization Formats', 'Modern quantization formats'],
  ['As AI models grow larger, running them becomes incredibly expensive. A dense 175-billion-parameter model requires multiple high-end enterprise GPUs running concurrently just to output a single word. To make these models practical for commercial use and deployable on smaller hardware, engineers rely on two massive efficiency breakthroughs:', 'As AI models get bigger, running them gets wildly expensive. A dense 175-billion-parameter model needs multiple enterprise GPUs just to output one word at a time. To make these models usable in products and on smaller hardware, engineers lean on two major efficiency plays:'],
  ['In a standard', 'In a standard'],
  ['model, every single parameter (the neural connections) is activated for every single word processed. This is highly inefficient; a model doesn\'t need to invoke its entire mathematical knowledge base to process a simple punctuation mark or pronoun.', 'model, every parameter activates for every word. That is wasteful; the model does not need its entire math brain for a comma or a pronoun.'],
  ['An', 'An'],
  ['architecture turns a dense model into a', 'architecture turns a dense model into a'],
  ['model by breaking it up into specialized compartments called', 'model by splitting it into specialized compartments called'],
  ['(typically inside the Feed-Forward Network layers). Instead of passing a word through all pathways, a dynamic', '(usually inside feed-forward layers). Instead of sending every word through every path, a dynamic'],
  ['decides which experts should handle which word.', 'decides which experts should handle each token.'],
  ['Imagine a model with 8 distinct "Experts." When a token is processed:', 'Imagine a model with 8 separate experts. When a token comes in:'],
  ['If the token is a line of Python code, the Router sends it to', 'If the token is Python code, the router sends it to'],
  ['and', 'and'],
  ['If the token is a word in French, the Router sends it to', 'If the token is French, the router sends it to'],
  ['Typically, the Router selects only the', 'Usually, the router selects only the'],
  ['for each token. If a model has a total of 8x 7B experts (56B total parameters), it only activates roughly 12B parameters per token. This gives the model the vast knowledge capacity of a 56B model, but with the fast generation speed and compute cost of a much smaller 12B model.', 'for each token. If the model has 8x 7B experts, or 56B total parameters, it might activate only about 12B per token. You get huge total capacity with per-token compute closer to a smaller model.'],
  ['MoE is not a free lunch. It introduces several hard engineering hurdles:', 'MoE is not free. It brings real engineering headaches:'],
  ['Although only 12B parameters are active at any millisecond, the entire 56B parameter model must still be loaded into the GPU\'s memory (VRAM). This means MoE requires significantly more memory than dense models of equivalent speed.', 'Even if only 12B parameters are active at a moment, the whole 56B model still has to sit in GPU memory. MoE can need much more VRAM than a dense model with similar active compute.'],
  ['During early training, the router might favor one expert, making it smarter, which causes the router to send even more traffic to it. Engineers must write custom algorithms to force load-balancing so all experts are trained evenly.', 'Early in training, the router can overuse one expert. That expert gets better, so the router sends it even more traffic. Engineers need load-balancing tricks so every expert learns.'],
  ['Neural networks represent their learned weights as high-precision decimals called floating-point numbers. During training, these are typically represented in 16-bit precision (', 'Neural networks store learned weights as high-precision decimals called floating-point numbers. During training, these usually use 16-bit precision ('],
  [').', ').'],
  ['Storing weights in 16-bit precision means every single parameter requires 2 bytes of GPU memory. A 70-billion-parameter model requires at least 140 gigabytes of VRAM just to load, which exceeds the capacity of almost all consumer GPUs.', 'At 16-bit precision, each parameter needs 2 bytes of GPU memory. A 70B model needs at least 140GB of VRAM just to load, which is way beyond most consumer GPUs.'],
  ['is the process of compressing these weights by reducing their numerical precision—mapping them to smaller formats like 8-bit integers (', 'compresses weights by lowering numerical precision, mapping them to smaller formats like 8-bit integers ('],
  ['), 4-bit integers (', '), 4-bit integers ('],
  ['), or even custom formats like', '), or custom formats like'],
  ['Think of quantization like reducing the color depth of a digital photo. If you convert a photo from 24-bit true color to an 8-bit color palette, the file size shrinks by 66%. The image looks slightly less smooth, but the shapes, objects, and overall context are still perfectly recognizable.', 'Quantization is like lowering the color depth of a photo. Convert 24-bit true color to an 8-bit palette and the file shrinks hard. It looks a bit less smooth, but the shapes and meaning are still obvious.'],
  ['Similarly, when we quantize a model from 16-bit to 4-bit, we decrease its size by 75%. A 70B model that once required 140GB of VRAM can now fit into roughly 35GB of VRAM. Remarkably, due to the high mathematical redundancy in neural networks, this massive compression results in only a tiny degradation in reasoning capability.', 'Similarly, quantizing a model from 16-bit to 4-bit cuts size by 75%. A 70B model that needed 140GB of VRAM can fit around 35GB. Because neural networks have lots of redundancy, the reasoning hit can be surprisingly small.'],
  ['Several standard file formats are used to run these compressed models:', 'Several standard formats run compressed models:'],
  ['Optimized specifically for CPU execution, allowing users to run large models on consumer laptops (like Apple Silicon Macbooks) by leveraging system RAM instead of expensive GPU VRAM.', 'Optimized for CPU execution, so large models can run on consumer laptops like Apple Silicon MacBooks using system RAM instead of GPU VRAM.'],
  ['Formats optimized for GPU-accelerated quantized inference, ensuring that compressed models generate text at blisteringly fast speeds on standard desktop graphic cards.', 'GPU-focused quantized formats that keep compressed models generating quickly on standard desktop graphics cards.'],
  ['The 2025-2026 open-weight wave made this efficiency story concrete. OpenAI\'s gpt-oss models, for example, use Transformer MoE architectures where the 117B-parameter model activates only 5.1B parameters per token and the 21B-parameter model activates 3.6B. That design lets model builders expose large total capacity while keeping the per-token compute closer to a much smaller dense model.', 'The 2025-2026 open-weight wave made the efficiency story real. OpenAI\'s gpt-oss models use Transformer MoE: the 117B model activates only 5.1B parameters per token, and the 21B model activates 3.6B. That gives builders large total capacity while keeping per-token compute closer to a smaller dense model.'],

  ['Diffusion & Generative Media', 'Diffusion & Generative Media'],
  ['The Diffusion Paradigm', 'The diffusion playbook'],
  ['1. The Forward Process (Destroying Information)', '1. Forward process: destroy the signal'],
  ['2. The Reverse Process (Creating Information)', '2. Reverse process: rebuild the signal'],
  ['Key Concept: Latent Diffusion', 'Key Concept: Latent diffusion'],
  ['Classifier-Free Guidance (CFG)', 'Classifier-Free Guidance (CFG)'],
  ['The Shift to Diffusion Transformers (DiT)', 'The shift to Diffusion Transformers (DiT)'],
  ['Generative AI for images and videos has undergone a massive transformation. Early image generators, called GANs (Generative Adversarial Networks), were notoriously difficult to train, often failing to produce coherent pictures. Today, almost all modern image and video generators (Stable Diffusion, Midjourney, Sora, Flux) rely on a mathematical concept called', 'Generative AI for images and videos has had a huge glow-up. Early image generators, GANs, were famously hard to train and often failed to produce coherent pictures. Today, most modern image and video generators, including Stable Diffusion, Midjourney, Sora, and Flux, rely on'],
  ['Instead of trying to draw an image from scratch, a diffusion model is trained to do one thing:', 'Rather than drawing from scratch, a diffusion model trains on one job:'],
  ['The process is divided into two phases: the forward process and the reverse process.', 'The process has two phases: forward and reverse.'],
  ['We take a clean photograph (say, of a golden retriever) and add a tiny layer of random mathematical noise. We repeat this step-by-step, perhaps 1,000 times, until the original dog is completely obliterated, leaving nothing but a block of pure gray static. This process requires no neural network; it is pure math.', 'Take a clean photo, say a golden retriever, and add a tiny layer of random mathematical noise. Repeat that maybe 1,000 times until the original image is gone and only gray static remains. No neural network needed here; it is pure math.'],
  ['This is where the neural network lives. We show the model a noisy image and ask it:', 'This is where the neural network enters. We show it a noisy image and ask:'],
  ['By training the model on millions of pairs of clean and noisy images, it learns to recognize subtle structures within noise. When we want to generate a new image, we feed the model a block of', 'By training on millions of clean/noisy image pairs, the model learns structure inside noise. To generate a new image, we feed it'],
  ['and a text prompt (e.g., "A golden retriever playing in the grass"). The model subtracts a sliver of estimated noise. We repeat this subtraction loop 20 to 50 times. Bit by bit, structures appear, and a completely unique, high-resolution image emerges.', 'plus a text prompt, like "A golden retriever playing in the grass." The model subtracts a little estimated noise, then repeats that loop 20 to 50 times. Bit by bit, structure appears and a unique high-resolution image emerges.'],
  ['Early diffusion models operated in', 'Early diffusion models worked in'],
  ['Generating a 1024x1024 pixel image meant calculating noise values for over a million pixels at every step. This made early models incredibly slow and memory-intensive.', 'Generating a 1024x1024 image meant calculating noise for more than a million pixels every step. Early models were slow and memory-hungry.'],
  ['The breakthrough was', 'The glow-up was'],
  ['(popularized by Stable Diffusion). It uses a', '(popularized by Stable Diffusion). It uses a'],
  ['to compress the image into a highly dense representation called "latent space" (shrinking a 512x512 image down to a 64x64 grid). The diffusion model does all its heavy lifting in this low-resolution space, and the VAE decodes the final latents back into pixels at the very end. This saved 90%+ of the compute, making image generation run on consumer laptops.', 'to compress the image into dense "latent space," like shrinking a 512x512 image into a 64x64 grid. The diffusion model does the heavy work in that smaller space, and the VAE decodes final latents back into pixels. That saves 90%+ of the compute and lets image generation run on consumer laptops.'],
  ['How does the model make sure the image it generates actually matches your prompt, instead of wandering off on its own? This is controlled by', 'How does the model keep the image aligned with your prompt instead of wandering off? That is controlled by'],
  ['During training, the model is occasionally trained without text prompts (unconditioned). During generation, the model predicts two things: what the noise removal should look like', 'During training, the model sometimes sees images without prompts. During generation, it predicts two versions of denoising: one'],
  ['the prompt, and what it should look like', 'the prompt, and one'],
  ['it. The CFG scale decides how much weight to give to the difference.', 'it. CFG scale controls how strongly to push toward the prompt.'],
  ['Gives the model creative freedom. The image will be artistic but might ignore parts of your prompt.', 'More creative freedom. The image may look artistic but ignore parts of the prompt.'],
  ['The sweet spot for high-quality, prompt-adhering images.', 'Usually the sweet spot for high-quality images that follow the prompt.'],
  ['Forces strict prompt adherence, though it can make the image look oversaturated and digitally artificial.', 'Forces strict prompt adherence, but can make the image oversaturated or fake-looking.'],
  ['Traditional diffusion models used a convolutional network backbone called a', 'Traditional diffusion models used a convolutional backbone called a'],
  ['to predict noise. However, U-Nets struggled to scale efficiently with massive datasets and compute budgets.', 'to predict noise. But U-Nets did not scale as cleanly with huge datasets and compute budgets.'],
  ['In 2023, researchers introduced the', 'In 2023, researchers introduced the'],
  ['. DiT replaces the U-Net with a standard Transformer backbone. By dividing the latent image into patches (similar to how an LLM divides text into tokens), DiT models can scale predictably: adding more parameters and compute directly correlates with better image and video fidelity. This architecture underpins the latest state-of-the-art models like OpenAI\'s Sora, Stable Diffusion 3, and Flux.', '. DiT replaces the U-Net with a Transformer backbone. It splits the latent image into patches, similar to text tokens in an LLM. Add more parameters and compute, and quality scales predictably. This pattern underpins frontier models like OpenAI\'s Sora, Stable Diffusion 3, and Flux.'],

  ['Agentic AI & Reasoning', 'Agentic AI & Reasoning'],
  ['Tool Use & Function Calling', 'Tool use and function calling'],
  ['Reasoning Loops: ReAct and Reflection', 'Reasoning loops: ReAct and reflection'],
  ['1. The ReAct (Reason + Act) Loop', '1. ReAct: reason, then act'],
  ['2. Reflection and Self-Correction', '2. Reflection and self-correction'],
  ['System 1 vs. System 2 Thinking in AI', 'System 1 vs. System 2 thinking in AI'],
  ['For the first few years of the LLM boom, AI models were treated as passive chatbots: you write a prompt, and the model instantly outputs a response. Today, the frontier has shifted toward', 'For the first few years of the LLM boom, AI models were treated like passive chatbots: write a prompt, get an instant answer. Now the frontier has shifted toward'],
  ['. Instead of answering statically, agentic systems act as autonomous software entities that can plan, use external tools, inspect their own output, and run in loops to solve multi-step problems.', '. Instead of one static answer, agentic systems can plan, use tools, inspect their output, and loop through multi-step work.'],
  ['LLMs are notoriously bad at precise math (like multiplying two 8-digit numbers) and cannot fetch live data or interact with the physical world because they are just word-prediction engines.', 'LLMs are famously bad at exact math, like multiplying two 8-digit numbers, and they cannot fetch live data or touch the physical world by themselves. They are word-prediction engines.'],
  ['overcomes this limitation by giving models hands. The model is provided with a list of available tools, described in plain text. For example:', 'fixes this by giving models hands. The host app gives the model a list of available tools in plain text, for example:'],
  ['If the user asks:', 'If the user asks:'],
  [', the LLM recognizes it cannot answer from memory. Instead of guessing, it outputs a structured instruction:', ', the LLM should realize memory is not enough. Instead of guessing, it emits a structured instruction:'],
  ['The host application intercepts this JSON, runs the actual weather API, receives the result (e.g., "Chicago: 41°F, Rain"), and appends it to the model\'s chat history. The LLM reads the result and finishes its response:', 'The host app intercepts the JSON, calls the real weather API, gets the result, and adds it back to the chat history. The LLM reads the result and finishes:'],
  ['To solve complex tasks, agents use structured loops rather than generating answers in a single pass.', 'For complex tasks, agents use structured loops instead of one-shot answers.'],
  ['ReAct forces the model to document its thinking before taking actions. The loop proceeds as follows:', 'ReAct makes the model reason before taking action. The loop goes like this:'],
  ['The model explains its plan (e.g., "I need to find the population of France, then multiply it by 0.12").', 'The model states a plan, like "find France\'s population, then multiply by 0.12."'],
  ['The model calls a search engine or calculator tool.', 'The model calls a search engine, calculator, or other tool.'],
  ['The model reads the tool\'s output and updates its plan, looping back to Thought until the task is complete.', 'The model reads the tool output, updates the plan, and loops until the task is done.'],
  ['If a model writes a block of code, it may contain a bug. A reflection agent doesn\'t send the code to the user immediately. Instead, it runs the code in an isolated environment, catches any error logs, feeds those errors back to itself, and rewrites the code to fix the bug. This cyclic feedback loop dramatically boosts task success rates.', 'If a model writes code, the first draft may be buggy. A reflection agent does not ship it immediately. It runs the code in an isolated environment, reads errors, feeds those errors back into the model, and rewrites the code. That feedback loop boosts task success.'],
  ['Cognitive psychologist Daniel Kahneman famously divided human thinking into two modes:', 'Daniel Kahneman famously split human thinking into two modes:'],
  ['Fast, intuitive, automatic actions (e.g., answering "2+2=?", reading a familiar road sign).', 'Fast, intuitive, automatic actions, like answering "2+2=?" or reading a familiar road sign.'],
  ['Slow, deliberate, logical reasoning (e.g., solving "17 × 24", filling out a tax form).', 'Slow, deliberate reasoning, like solving "17 x 24" or filling out a tax form.'],
  ['Standard LLMs operate mostly like', 'Standard LLMs mostly act like'],
  ['. They output the next token immediately without much opportunity to plan, test, or revise. If they start a sentence poorly, they cannot truly rewind the generation path.', '. They output the next token immediately, with limited room to plan, test, or revise. If the answer starts badly, they cannot truly rewind.'],
  ['Modern', 'Modern'],
  ['spend extra inference-time compute before producing a final answer. OpenAI\'s GPT-5.5, Google\'s Gemini 3.5 Flash, DeepSeek-R1, and related reasoning systems all point toward the same design shift: models are being trained and served to plan, use tools, check intermediate work, and keep going across longer workflows. Some expose a visible plan or controllable "thinking" effort; others keep the reasoning internal while returning a concise answer.', 'spend extra inference-time compute before giving the final answer. OpenAI\'s GPT-5.5, Google\'s Gemini 3.5 Flash, DeepSeek-R1, and related reasoning systems all point to the same shift: models plan, use tools, check intermediate work, and keep going across longer workflows. Some show controllable "thinking" effort; others keep it internal and return a concise answer.'],

  ['Future Frontiers & Physical AI', 'Future Frontiers & Physical AI'],
  ['Native Multimodality', 'Native multimodality'],
  ['The "Data Wall" and Synthetic Data', 'The data wall and synthetic data'],
  ['The Promise and Danger of Synthetic Data', 'Synthetic data: promise and risk'],
  ['Robotics and Physical Grounding', 'Robotics and physical grounding'],
  ['The Next Paradigm: Test-Time Compute', 'The next paradigm: test-time compute'],
  ['We are entering a new era of artificial intelligence. The frontier is no longer just about making models bigger. Researchers are expanding models into the physical world, training them to process multiple senses natively, and shifting from one-shot answers toward agents that can take action over time.', 'AI is entering a new era. The frontier is no longer just "make the model bigger." Researchers are pushing models into the physical world, giving them native multimodal senses, and shifting from one-shot answers toward agents that act over time.'],
  ['Early multimodal systems were', 'Early multimodal systems were'],
  ['together. For example, to let an AI "see" an image, engineers would run an image-captioning model to generate a text description, and then feed that text to the LLM. This was incredibly lossy; a text caption cannot capture the precise spatial layout of a room, the emotional expression on a face, or the specific pitch of a sound.', 'together. To let AI "see" an image, engineers would caption the image as text, then feed that caption to the LLM. That loses a lot: spatial layout, facial expression, sound pitch, and other details get flattened.'],
  ['Modern state-of-the-art models (like Gemini and GPT-5.5) are', 'Modern frontier models, like Gemini and GPT-5.5, are'],
  ['. They are built with a unified architecture or tightly integrated model system. Text, pixels, audio waveforms, video frames, and tool outputs are converted into a shared mathematical language (embeddings) and routed through models that can reason across them.', '. They use a unified architecture or tightly integrated model system. Text, pixels, audio, video frames, and tool outputs become shared embeddings that models can reason across.'],
  ['This allows the model to reason across modalities simultaneously. A native multimodal model can watch a video, listen to the speaker\'s sarcasm, read the slides in the background, and output a unified analysis in real time, catching nuances that stitched systems miss entirely.', 'That lets the model reason across modalities at the same time. A native multimodal model can watch a video, hear sarcasm, read background slides, and produce one real-time analysis, catching details stitched systems miss.'],
  ['For a decade, AI progress was fueled by feeding models more data. However, the industry is hitting a', 'For a decade, AI progress came from feeding models more data. But the industry is hitting a'],
  [': LLMs have already consumed almost all high-quality, publicly available human-written text on the internet.', ': LLMs have already consumed most high-quality public human-written text on the internet.'],
  ['To continue training, researchers are turning to', 'To keep training, researchers are turning to'],
  ['—data generated by AI models to train other AI models.', ': data generated by AI models to train other AI models.'],
  ['If models train on unverified synthetic data, they risk', 'If models train on unverified synthetic data, they risk'],
  ['—a phenomenon where errors, biases, and weird linguistic quirks compound over generations, causing the model to become increasingly stupid and disconnected from reality.', ': errors, biases, and weird language quirks compound over generations until the model drifts away from reality.'],
  ['To prevent this, engineers use', 'The fix is'],
  [': using external environments to validate the AI\'s data. For example:', ': external environments validate the AI-generated data before training. For example:'],
  ['An AI generates code, which is then run in a', 'AI generates code, then it runs through a'],
  ['to verify it works. Only working code is used for training.', 'to verify it works. Only passing code gets used for training.'],
  ['An AI solves a math problem. The solution is validated using', 'AI solves a math problem, then the solution gets checked by'],
  ['An AI reasons about physical properties. The scenario is run through a', 'AI reasons about physics, then the scenario runs through a'],
  ['to make sure it follows real-world laws.', 'to make sure it follows real-world laws.'],
  ['For AI to truly understand the world, it must interact with it. By combining multimodal LLMs with robotic control systems, researchers have developed', 'For AI to understand the world, it has to interact with it. By combining multimodal LLMs with robotic control, researchers have developed'],
  ['models such as Google\'s RT-2 and Gemini Robotics.', 'models like Google\'s RT-2 and Gemini Robotics.'],
  ['A VLA model doesn\'t just output text; it outputs physical actions for a robot\'s joints and grippers. When you tell a VLA-enabled robot arm:', 'A VLA model does not just output text; it outputs physical actions for robot joints and grippers. Tell a VLA robot arm:'],
  ['the model processes the camera feed (pixels), matches the words to the objects, calculates the spatial path, and controls the robot\'s motors directly. The LLM acts as the robot\'s planning layer, giving it common-sense reasoning and adaptability to new environments without custom programming for every object.', 'and the model processes the camera feed, matches words to objects, calculates the path, and controls the motors. The LLM becomes the planning layer, giving the robot common-sense reasoning without custom programming for every object.'],
  ['Pre-training scaling laws (adding more parameters and GPUs during training) are no longer the only axis of progress. The newer vector is', 'Pre-training scaling laws, meaning more parameters and GPUs during training, are no longer the only progress axis. The newer lever is'],
  ['(scaling at inference time).', '(scaling at inference time).'],
  ['Instead of forcing a model to answer within a fraction of a second, test-time compute lets the model spend extra compute planning, checking, searching, or coordinating tools. This is why frontier model releases increasingly emphasize agentic coding, computer use, document work, and scientific workflows rather than only chat benchmark scores. The practical question is becoming: how much thought should the system buy for this task?', 'Instead of forcing an answer in a fraction of a second, test-time compute lets the model spend extra work planning, checking, searching, or coordinating tools. That is why frontier releases increasingly emphasize agentic coding, computer use, document work, and scientific workflows, not just chat benchmarks. The practical question becomes: how much thinking should this task buy?'],
]);

const normalizedTextTranslations = new Map(
  [...exactTextTranslations].map(([key, value]) => [normalizeWhitespace(key), value])
);

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function translateWithPhraseRules(content) {
  return content
    .replace(/\bArtificial Intelligence\b/g, 'AI')
    .replace(/\bartificial intelligence\b/g, 'AI')
    .replace(/\bLarge Language Models \(LLMs\)\b/g, 'LLMs')
    .replace(/\blarge language models\b/g, 'LLMs')
    .replace(/\bUnderstanding\b/g, 'Getting')
    .replace(/\bunderstand\b/g, 'get')
    .replace(/\bUnderstand\b/g, 'Get')
    .replace(/\bExplore\b/g, 'Vibe-check')
    .replace(/\bexplore\b/g, 'vibe-check')
    .replace(/\bLearn\b/g, 'Lock in on')
    .replace(/\blearn\b/g, 'lock in on')
    .replace(/\bCreating\b/g, 'Cooking up')
    .replace(/\bcreating\b/g, 'cooking up')
    .replace(/\brequires\b/g, 'needs')
    .replace(/\bRequires\b/g, 'Needs')
    .replace(/\bjourney\b/g, 'arc')
    .replace(/\bJourney\b/g, 'Arc')
    .replace(/\bhelpful\b/g, 'useful')
    .replace(/\bHelpful\b/g, 'Useful')
    .replace(/\bmultiple\b/g, 'several')
    .replace(/\bMultiple\b/g, 'Several')
    .replace(/\bdivided\b/g, 'split')
    .replace(/\bDivided\b/g, 'Split')
    .replace(/\bimportant\b/g, 'big-deal')
    .replace(/\bImportant\b/g, 'Big-deal')
    .replace(/\bpowerful\b/g, 'high-impact')
    .replace(/\bPowerful\b/g, 'High-impact')
    .replace(/\befficient\b/g, 'efficient')
    .replace(/\bfast\b/g, 'fast')
    .replace(/\bdifficult\b/g, 'rough')
    .replace(/\bDifficult\b/g, 'Rough')
    .replace(/\bcomplex\b/g, 'complex')
    .replace(/\bexcellent\b/g, 'great')
    .replace(/\bExcellent\b/g, 'Great')
    .replace(/\bsignificant\b/g, 'major')
    .replace(/\bSignificant\b/g, 'Major')
    .replace(/\badvancements\b/g, 'glow-ups')
    .replace(/\bAdvancements\b/g, 'Glow-ups')
    .replace(/\bbreakthroughs\b/g, 'glow-ups')
    .replace(/\bBreakthroughs\b/g, 'Glow-ups')
    .replace(/\bstate-of-the-art\b/g, 'frontier-tier')
    .replace(/\bState-of-the-art\b/g, 'Frontier-tier')
    .replace(/\bHowever,\s/g, 'But ')
    .replace(/\bTherefore,\s/g, 'So ')
    .replace(/\bIn production systems,\s/g, 'In real apps, ')
    .replace(/\bFor example,\s/g, 'For example, ')
    .replace(/\bThis means\b/g, 'Translation:');
}

function rewriteStaticAssets(html, rel) {
  if (isTopLevel(rel)) {
    return html
      .replaceAll('href="style.css"', 'href="../style.css"')
      .replaceAll('src="app.js"', 'src="../app.js"');
  }

  return html
    .replaceAll('href="../style.css"', 'href="../../style.css"')
    .replaceAll('src="../app.js"', 'src="../../app.js"');
}

function rewriteGenZControl(html, rel) {
  const originalHref = isTopLevel(rel) ? `../${rel}` : `../../${rel}`;
  return html.replace(
    /<a href="[^"]*" class="btn-icon genz-link" aria-label="[^"]+">Gen Z<\/a>/,
    `<a href="${originalHref}" class="btn-icon genz-link active" aria-label="Read the original version">Original</a>`
  );
}

function rewriteInternalLinks(html, rel) {
  if (isTopLevel(rel)) {
    return html
      .replaceAll('href="index.html"', 'href="index.html"')
      .replaceAll('href="game.html"', 'href="game.html"')
      .replaceAll('href="chapters/', 'href="chapters/');
  }

  return html
    .replaceAll('href="../index.html"', 'href="../index.html"')
    .replaceAll('href="chapter', 'href="chapter');
}

function escapeAttribute(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

function isTopLevel(rel) {
  return !rel.includes(path.sep) && !rel.includes('/');
}

for (const rel of files) {
  const source = path.join(root, rel);
  const target = path.join(root, 'genz', rel);
  const html = readFileSync(source, 'utf8');
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, buildGenZPage(html, rel));
}

console.log(`Generated ${files.length} static Gen Z pages.`);
