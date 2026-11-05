import {
  CONTRACT_INDEX_KEY,
  CONTRACT_NAMESPACE,
  CONTRACT_SCHEMA,
} from '../types/annotations'

/**
 * The text copied by "Copy agent instructions". It is read by an AI agent
 * connected to the Penpot MCP server, not by the designer: it stays in English
 * and is deliberately not a translation key.
 */
export const buildAgentInstructions = (key?: string): string =>
  [
    'This Penpot file holds machine contracts written by the Component Handoff plugin. A contract is the declarative description of a component or a component family (props, rules, tokens, exceptions). Use it to implement the component instead of reverse-engineering the design.',
    '',
    `Where to read it (Penpot MCP server, execute_code; shared plugin data, namespace "${CONTRACT_NAMESPACE}"):`,
    `1. The list of contracts: JSON.parse(penpot.currentFile.getSharedPluginData('${CONTRACT_NAMESPACE}', '${CONTRACT_INDEX_KEY}')) -> [{ key, name, page, status }].`,
    key
      ? `2. The contract you need is "${key}": JSON.parse(penpot.currentFile.getSharedPluginData('${CONTRACT_NAMESPACE}', '${key}')).`
      : `2. The contract you need: JSON.parse(penpot.currentFile.getSharedPluginData('${CONTRACT_NAMESPACE}', '<key>')), <key> being the "contract:<id>" of its index entry.`,
    `The schema you are expected to read is "${CONTRACT_SCHEMA}". If a contract declares another schema, say so and stop.`,
    '',
    'Check that it is current before relying on it:',
    '- "status" is "current" or "outdated". "current" means current at the last check made while the plugin was open: the plugin cannot see changes made while it is closed. Always report the contract\'s "generatedAt" to the user so they can judge how fresh it is.',
    '- If "status" is "outdated", or if no contract exists for the component, say so and ask the user to update (or generate) it in Component Handoff before implementing. Fall back on the shape tree and generateStyle only if the user tells you to.',
    '',
    'How to implement it:',
    '- "props" are the component\'s API: implement each variant property and its values as a prop.',
    '- "rules" are styles to reproduce. Reference tokens by name (e.g. {spacing.sm}); never write the resolved value. Follow a token chain through "tokens".',
    '- A rule with "by" varies with that prop: one value per prop value.',
    '- "parts" are identified by layer path; "in" tells which variants contain a part.',
    '- "exceptions" are not rules. List them to the user instead of hard-coding them silently, and never promote them to rules.',
  ].join('\n')
