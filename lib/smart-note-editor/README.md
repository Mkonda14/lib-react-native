# @your-org/smart-note-editor

> Éditeur de notes Markdown intelligent pour React Native — basé sur `@expensify/react-native-live-markdown`, avec toolbar de formatage, undo/redo, intégration IA, auto-save, et plus.

## Fonctionnalités

- ✅ **Live markdown rendering** — formate le markdown en temps réel pendant la frappe
- ✅ **Toolbar complète** — bold, italic, strikethrough, code, headings (H1-H6), listes à puces, listes numérotées, cases à cocher, citations, blocs de code, liens, images, lignes horizontales
- ✅ **Undo/redo** — historique avec débounce (batch typing)
- ✅ **Cases à cocher** — toggle en un tap, progression automatique (3/5 done)
- ✅ **Continuation de liste** — Enter sur un `- item` ajoute automatiquement `- `
- ✅ **Indentation** — Tab / Shift-Tab pour nested lists
- ✅ **Intégration IA** — streaming de markdown généré par IA (OpenAI, Anthropic, etc.)
- ✅ **Auto-save** — sauvegarde automatique vers AsyncStorage
- ✅ **Keyboard accessory** — toolbar flottante au-dessus du clavier (iOS natif + Android)
- ✅ **Sélection-aware** — wrap le texte sélectionné avec le format
- ✅ **Stats** — word count, char count, reading time
- ✅ **Thème dark/light** — couleurs personnalisables
- ✅ **Table of contents** — extraction des headings
- ✅ **Parser** — détecte les formats actifs à la position du curseur

## Installation

```bash
npm install @expensify/react-native-live-markdown
# Optionnel pour l'auto-save:
npm install @react-native-async-storage/async-storage
```

## Démarrage rapide

```tsx
import { SmartNoteEditor } from '@your-org/smart-note-editor'

export function NoteScreen() {
  return (
    <SmartNoteEditor
      defaultValue="# Ma note\n\nÉcrivez ici…"
      placeholder="Commencez à écrire…"
      showToolbar
      toolbarPosition="keyboard"
      enableHistory
      dark={false}
      onValueChange={(v) => console.log(v)}
      onDebouncedChange={(v) => saveToBackend(v)}
    />
  )
}
```

## API complète

### Props

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `defaultValue` | `string` | `''` | Valeur initiale |
| `value` | `string` | — | Valeur contrôlée |
| `onValueChange` | `(v: string) => void` | — | Appelé à chaque changement |
| `onDebouncedChange` | `(v: string) => void` | — | Appelé après `debounceMs` |
| `debounceMs` | `number` | `500` | Délai du debounce |
| `placeholder` | `string` | `'Commencez à écrire…'` | Placeholder |
| `editable` | `boolean` | `true` | Éditable |
| `autoFocus` | `boolean` | `false` | Auto-focus au montage |
| `showToolbar` | `boolean` | `true` | Afficher la toolbar |
| `toolbarPosition` | `'top' \| 'bottom' \| 'floating' \| 'keyboard'` | `'keyboard'` | Position toolbar |
| `toolbarButtons` | `MarkdownFormat[]` | tous | Boutons visibles |
| `maxLength` | `number` | — | Longueur max |
| `dark` | `boolean` | `false` | Thème sombre |
| `theme` | `Partial<EditorTheme>` | — | Override thème |
| `markdownStyle` | `Partial<MarkdownStyle>` | — | Override styles markdown |
| `enableHistory` | `boolean` | `true` | Undo/redo |
| `maxHistory` | `number` | `100` | Max entrées historique |
| `autoSaveKey` | `string` | — | Clé AsyncStorage |
| `autoSaveDebounce` | `number` | `2000` | Délai auto-save |
| `enableAI` | `boolean` | `false` | Bouton IA |
| `aiSource` | `(prompt) => AsyncIterable<AIMarkdownChunk>` | — | Source IA |
| `buildAIPrompt` | `(context) => string` | — | Prompt builder |

### Ref API (imperative)

```tsx
const ref = useRef<SmartNoteEditorRef>(null)

// Actions
ref.current?.focus()
ref.current?.blur()
ref.current?.insertText('Hello')
ref.current?.wrapSelection('**', '**')
ref.current?.format('bold')
ref.current?.undo()
ref.current?.redo()
ref.current?.clear()

// AI
await ref.current?.insertAIMarkdown('# Titre IA\n\nContenu généré…', { mode: 'append' })

// Export
ref.current?.exportMarkdown()
ref.current?.exportPlainText()

// Stats
ref.current?.getStats() // { wordCount, charCount, lineCount, readingTimeMinutes }
```

## Formats supportés

### Inline

| Format | Syntaxe | Raccourci toolbar |
|--------|---------|-------------------|
| **Gras** | `**texte**` | `B` |
| *Italique* | `_texte_` | `I` |
| ~~Barré~~ | `~~texte~~` | `S` |
| `Code` | `` `code` `` | `</>` |
| [Lien](url) | `[texte](url)` | `🔗` |

### Blocs

| Format | Syntaxe | Raccourci |
|--------|---------|-----------|
| Titre 1-6 | `# ` à `###### ` | `H1`-`H6` |
| Liste à puces | `- item` | `•` |
| Liste numérotée | `1. item` | `1.` |
| Case à cocher | `- [ ] item` / `- [x] item` | `☑` |
| Citation | `> texte` | `"` |
| Bloc de code | ` ```code``` ` | `{}` |
| Ligne horizontale | `---` | `—` |

## Intégration IA

```tsx
import { SmartNoteEditor } from '@your-org/smart-note-editor'

async function* aiStream(prompt: string) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    }),
  })

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      yield { text: '', done: true }
      break
    }
    const chunk = decoder.decode(value)
    // Parse SSE + yield text
    yield { text: parseSSEChunk(chunk) }
  }
}

<SmartNoteEditor
  enableAI
  aiSource={aiStream}
  buildAIPrompt={(context) => `Continue cette note en markdown:\n\n${context}`}
  onAIStart={() => setLoading(true)}
  onAIComplete={() => setLoading(false)}
/>
```

## Auto-save

```tsx
<SmartNoteEditor
  autoSaveKey="note:my-note-id"
  autoSaveDebounce={2000}
  onDebouncedChange={(v) => syncToBackend(v)}
/>
```

La note est automatiquement sauvegardée dans AsyncStorage toutes les 2s, et restaurée au prochain lancement.

## Thème personnalisé

```tsx
import { LIGHT_THEME, SmartNoteEditor } from '@your-org/smart-note-editor'

<SmartNoteEditor
  theme={{
    ...LIGHT_THEME,
    cursorColor: '#10B981',
    linkColor: '#3B82F6',
    h1Color: '#111827',
  }}
  markdownStyle={{
    h1: { fontSize: 32, fontWeight: '800' },
    code: { backgroundColor: '#F3F4F6' },
  }}
/>
```

## Hooks individuels

### `useNoteEditor` — hook principal

```tsx
const editor = useNoteEditor({
  defaultValue: '',
  enableHistory: true,
  onValueChange: (v) => console.log(v),
})

return (
  <View>
    <TextInput
      value={editor.value}
      onChangeText={editor.handleValueChange}
      onSelectionChange={editor.handleSelectionChange}
    />
    <Button title="Bold" onPress={() => editor.actions.format('bold')} />
    <Button title="Undo" onPress={editor.undo} disabled={!editor.canUndo} />
    <Text>{editor.stats.wordCount} mots</Text>
  </View>
)
```

### `useMarkdownActions` — actions standalone

```tsx
const { format, toggleTodo, indent, dedent, insertLink, insertTable } = useMarkdownActions({
  value,
  selection,
  onChange: (result) => applyResult(result),
})
```

### `useHistory` — undo/redo

```tsx
const { value, undo, redo, canUndo, canRedo } = useHistory({ maxHistory: 50 })
```

## Utilitaires Markdown

```tsx
import {
  countWords,
  readingTime,
  markdownToPlainText,
  extractTOC,
  extractCheckboxes,
  getCheckboxProgress,
  toggleCheckbox,
  continueList,
} from '@your-org/smart-note-editor'

const text = `# Todo\n- [ ] Task 1\n- [x] Task 2\n- [ ] Task 3`

countWords(text)                        // 6
readingTime(text)                        // 1 (minute)
markdownToPlainText(text)                // "Todo\nTask 1\nTask 2\nTask 3"
extractTOC(text)                         // [{ level: 1, text: 'Todo', position: 0 }]
extractCheckboxes(text)                  // [{ position: 6, checked: false, text: 'Task 1' }, ...]
getCheckboxProgress(text)                // { done: 1, total: 3, percentage: 33 }
```

## Pré-requis

- `@expensify/react-native-live-markdown` ≥ 0.1.0
- React Native ≥ 0.74
- (Optionnel) `@react-native-async-storage/async-storage` pour l'auto-save

## Fichiers

```
smart-note-editor/
├── README.md
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                    — exports publics
    ├── types.ts                    — interfaces TypeScript
    ├── SmartNoteEditor.tsx         — composant principal
    ├── components/
    │   ├── Toolbar.tsx             — barre de formatage
    │   └── KeyboardAccessory.tsx   — accessoire clavier (iOS natif)
    ├── hooks/
    │   ├── useNoteEditor.ts        — hook principal (orchestration)
    │   ├── useMarkdownActions.ts   — actions markdown
    │   ├── useHistory.ts           — undo/redo
    │   ├── useSelection.ts         — tracking sélection
    │   └── useKeyboard.ts          — visibilité clavier
    └── utils/
        ├── markdown.ts             — manipulation markdown (insert/toggle/wrap)
        └── parser.ts              — parser (détection formats actifs, TOC, checkboxes)
```

## License

MIT.