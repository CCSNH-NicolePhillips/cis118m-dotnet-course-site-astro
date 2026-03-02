/**
 * Hard-coded telemetry integrity rules.
 * These override the AI's integrityAnalysis when behavioral data is unambiguous.
 * 
 * The AI tends to rationalize away red flags ("probably used an external editor").
 * These rules ensure that obviously suspicious telemetry is always flagged.
 */

/**
 * Analyze telemetry data and return hard flags + risk level.
 * @param {object} telemetry - Raw telemetry from the editor
 * @param {string} type - 'lab' or 'homework'
 * @returns {{ riskLevel: string, flags: string[], reasoning: string }}
 */
export function computeTelemetryIntegrity(telemetry, type = 'lab') {
  if (!telemetry || typeof telemetry !== 'object') {
    return { riskLevel: 'unknown', flags: ['No telemetry data received'], reasoning: 'Telemetry was not captured for this submission.' };
  }

  const flags = [];
  let riskLevel = 'low';

  const keystrokes = telemetry.keystrokeCount || 0;
  const pasteCount = telemetry.pasteCount || 0;
  const pasteChars = telemetry.pasteCharTotal || 0;
  const largestPaste = telemetry.largestPaste || 0;
  const editDuration = telemetry.editDurationSec || 0;
  const totalEdits = telemetry.totalEdits || 0;
  const codeLength = telemetry.codeLength || telemetry.reflectionLength || 0;

  // === CRITICAL FLAGS (auto-HIGH) ===

  // Zero keystrokes + code exists = entirely pasted or pre-loaded
  if (keystrokes === 0 && codeLength > 50) {
    flags.push(`Zero keystrokes with ${codeLength} chars of ${type === 'lab' ? 'code' : 'text'} — entire submission was pasted`);
    riskLevel = 'high';
  }

  // Single paste = entire code (within 95%)
  if (pasteCount === 1 && largestPaste > 0 && codeLength > 50 && (largestPaste / codeLength) >= 0.90) {
    flags.push(`Single paste (${largestPaste} chars) accounts for ${Math.round((largestPaste / codeLength) * 100)}% of the submission`);
    riskLevel = 'high';
  }

  // Zero edit duration with substantial code
  if (editDuration === 0 && codeLength > 100) {
    flags.push(`Zero seconds of active editing for ${codeLength} chars of ${type === 'lab' ? 'code' : 'text'}`);
    riskLevel = 'high';
  }

  // === STRONG FLAGS (auto-MEDIUM minimum, HIGH if combined) ===

  // Paste chars are majority of code
  if (pasteChars > 0 && codeLength > 50 && (pasteChars / codeLength) >= 0.75) {
    flags.push(`${Math.round((pasteChars / codeLength) * 100)}% of submission was pasted (${pasteChars}/${codeLength} chars)`);
    if (riskLevel !== 'high') riskLevel = 'medium';
  }

  // Very low keystroke-to-length ratio (typing < 20% of final output)
  if (keystrokes > 0 && codeLength > 100 && (keystrokes / codeLength) < 0.20) {
    flags.push(`Keystroke ratio suspiciously low: ${keystrokes} keystrokes for ${codeLength} chars (${Math.round((keystrokes / codeLength) * 100)}%)`);
    if (riskLevel !== 'high') riskLevel = 'medium';
  }

  // Edit duration extremely short relative to code length (< 1 second per 10 chars)
  if (editDuration > 0 && codeLength > 200 && (editDuration / (codeLength / 10)) < 1) {
    flags.push(`Edit duration suspiciously short: ${editDuration}s for ${codeLength} chars (${(codeLength / editDuration).toFixed(0)} chars/sec)`);
    if (riskLevel !== 'high') riskLevel = 'medium';
  }

  // Multiple paste flags compound to HIGH
  if (riskLevel === 'medium' && flags.length >= 2) {
    riskLevel = 'high';
  }

  // === Build reasoning ===
  let reasoning;
  if (riskLevel === 'high') {
    reasoning = `Telemetry indicates this submission was not manually typed in the editor. ${flags.length} behavioral red flag${flags.length > 1 ? 's' : ''} detected.`;
  } else if (riskLevel === 'medium') {
    reasoning = `Telemetry shows some indicators of external code import. Manual review recommended.`;
  } else {
    reasoning = `Telemetry patterns are consistent with manual code entry.`;
  }

  return { riskLevel, flags, reasoning };
}

/**
 * Merge hard telemetry flags with AI's integrity analysis.
 * Hard flags always win — if telemetry says HIGH, final is HIGH regardless of AI opinion.
 * AI flags are preserved and appended.
 * 
 * @param {object} aiAnalysis - The AI's integrityAnalysis from Gemini
 * @param {object} telemetryAnalysis - Result from computeTelemetryIntegrity
 * @returns {object} Merged integrity analysis
 */
export function mergeIntegrityAnalysis(aiAnalysis, telemetryAnalysis) {
  const ai = aiAnalysis || {};
  const tel = telemetryAnalysis || {};

  // Combine flags (telemetry flags first, then AI flags)
  const allFlags = [
    ...(tel.flags || []),
    ...(ai.flags || []).filter(f => !tel.flags?.some(tf => tf.includes(f.substring(0, 20))))
  ];

  // Risk level: take the more severe between AI and telemetry
  const riskOrder = { 'low': 0, 'unknown': 0, 'medium': 1, 'high': 2 };
  const aiRisk = riskOrder[ai.riskLevel] || 0;
  const telRisk = riskOrder[tel.riskLevel] || 0;
  const finalRisk = telRisk >= aiRisk ? (tel.riskLevel || 'unknown') : ai.riskLevel;

  // Combine reasoning
  let reasoning = '';
  if (tel.riskLevel === 'high' || tel.riskLevel === 'medium') {
    reasoning = tel.reasoning;
    if (ai.reasoning) reasoning += ' AI analysis: ' + ai.reasoning;
  } else {
    reasoning = ai.reasoning || tel.reasoning || '';
  }

  return {
    riskLevel: finalRisk,
    flags: allFlags,
    reasoning,
    telemetryRisk: tel.riskLevel || 'unknown',
    aiRisk: ai.riskLevel || 'unknown'
  };
}
