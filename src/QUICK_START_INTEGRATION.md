# ⚡ БЫСТРЫЙ СТАРТ: Интеграция Figma Make → Replit

## 🎯 ТРИ ПРОСТЫХ ШАГА

### 📤 ШАГ 1: Figma Make (СЕЙЧАС)

```bash
# 1. Добавь файлы
git add figma-ui/
git add *_PROMPT.md
git add *_CHECKLIST.md

# 2. Коммит
git commit -m "feat: CEO Mission Control View + shared UI components"

# 3. Push
git push origin main
```

✅ **Готово!** UI компоненты в GitHub.

---

### 📥 ШАГ 2: Replit AI

Скопируй и отправь в Replit AI:

```
Pull из GitHub и создай Container для CEO Mission Control.

Выполни:

1. git pull origin main

2. Проверь:
   ls -la src/figma-ui/components/dashboard/

3. Создай Container:
   src/containers/dashboard/CEOMissionControlContainer.tsx
   
   Используй пример из:
   src/figma-ui/GIT_COMMIT_INSTRUCTIONS.md
   (секция "3️⃣ Создай Container компонент")

4. Обнови UnifiedDashboard:
   - Импорт: import { CEOMissionControlContainer } from '../../containers/dashboard/CEOMissionControlContainer';
   - Рендер: {mode === 'ceo' && <CEOMissionControlContainer />}

5. Тестируй: npm run dev

6. Коммит:
   git add src/containers/
   git commit -m "feat: CEO Mission Control Container"
   git push origin main

Готово!
```

✅ **Готово!** Container создан и работает.

---

### 🧪 ШАГ 3: Проверка

Открой приложение:
- [ ] Переключись в CEO режим
- [ ] Big 4 KPI отображаются
- [ ] Графики рендерятся
- [ ] Алерты показываются
- [ ] Топ партнёры видны

✅ **ВСЁ РАБОТАЕТ!** 🎉

---

## 📁 Что где находится

```
GitHub: /figma-ui/                         ← Figma Make пушит сюда
  ├── components/dashboard/
  │   └── CEOMissionControlView.tsx        ← Чистый UI
  └── components/shared/
      ├── KPICard.tsx
      └── ...

Replit: /src/figma-ui/                     ← Импорт из GitHub
  └── (то же самое)

Replit: /src/containers/dashboard/         ← Создаётся в Replit
  └── CEOMissionControlContainer.tsx       ← Логика + API
```

---

## 🔄 В будущем

### Когда нужно изменить UI:

1. **Figma Make:** Меняй файл в `/figma-ui/`
2. **Git:** Коммит + Push
3. **Replit:** Pull
4. **Автоматически:** UI обновляется

Container НЕ трогаешь!

### Когда нужно добавить логику:

1. **Replit:** Открой Container
2. **Добавь:** API запрос / useEffect
3. **Git:** Коммит + Push

View НЕ трогаешь!

---

## 🎨 Добавить новый компонент

### Figma Make:
```tsx
// /figma-ui/components/dashboard/NewView.tsx
export function NewView({ data, onClick }: NewViewProps) {
  return <div>{data}</div>;
}
```

### Replit:
```tsx
// /src/containers/dashboard/NewContainer.tsx
export function NewContainer() {
  const [data, setData] = useState(null);
  useEffect(() => { loadData(); }, []);
  return <NewView data={data} onClick={handleClick} />;
}
```

---

## 📚 Документация

- **Общая:** `/figma-ui/README.md`
- **Для Replit:** `/figma-ui/INTEGRATION_GUIDE.md`
- **Git:** `/figma-ui/GIT_COMMIT_INSTRUCTIONS.md`
- **Workflow:** `/figma-ui/WORKFLOW_DIAGRAM.md`

---

## ✅ Чеклист готовности

- [x] `/figma-ui/` структура создана
- [x] CEOMissionControlView готов
- [x] Shared компоненты готовы
- [x] shadcn/ui компоненты готовы
- [x] Документация готова
- [x] Импорты исправлены
- [ ] Git коммит сделан ← **СДЕЛАЙ СЕЙЧАС**
- [ ] Replit интеграция ← После коммита
- [ ] Тестирование ← После интеграци��

---

## 🚀 НАЧИНАЙ!

```bash
git add figma-ui/
git commit -m "feat: CEO Mission Control View + shared UI"
git push origin main
```

Затем отправь промт в Replit AI из `/REPLIT_NEXT_STEPS_PROMPT.md`

**ГОТОВО!** 🎉
