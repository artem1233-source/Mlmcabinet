# 🔗 Инструкция: Подключение к GitHub

## 📋 Шаг 1: Создание GitHub репозитория

### Вариант A: Через веб-интерфейс GitHub

1. Откройте https://github.com/new
2. Заполните:
   - **Repository name:** `mlm-hydrogen-partner-app` (или своё название)
   - **Description:** "MLM Partner Dashboard with Hydrogen Products"
   - **Visibility:** Private (рекомендуется)
   - ✅ **Add README** (отметьте галочку)
   - **.gitignore:** Node
   - **License:** None (или MIT)
3. Нажмите **"Create repository"**

### Вариант B: Использовать существующий репозиторий

Если у вас уже есть репозиторий:
- Просто запомните URL: `https://github.com/ваш-username/ваш-репо`

---

## 📋 Шаг 2: Подключение Figma Make к GitHub

### Способ 1: Встроенная интеграция (РЕКОМЕНДУЕТСЯ)

1. **В Figma Make:**
   - Ищите кнопку **"Connect to GitHub"** (обычно справа вверху или в меню)
   - Или **Settings** → **GitHub Integration**

2. **Авторизация:**
   - Нажмите **"Authorize Figma Make"**
   - Войдите в GitHub
   - Разрешите доступ к репозиториям

3. **Выбор репозитория:**
   - Выберите созданный репозиторий
   - Или создайте новый прямо из интерфейса

4. **Первый коммит:**
   - Figma Make автоматически запушит все файлы
   - Проверьте в GitHub что файлы появились

### Способ 2: Ручная настройка (если нет встроенной интеграции)

**⚠️ Требует доступа к командной строке**

```bash
# 1. Инициализация Git (если ещё не инициализирован)
git init

# 2. Добавление remote
git remote add origin https://github.com/ваш-username/ваш-репо.git

# 3. Создание .gitignore
cat > .gitignore << EOF
node_modules/
.env
.env.local
dist/
build/
*.log
.DS_Store
EOF

# 4. Первый коммит
git add .
git commit -m "Initial commit: Figma Make UI components"

# 5. Push в GitHub
git branch -M main
git push -u origin main
```

---

## 📋 Шаг 3: Структура файлов для GitHub

### Что коммитим в GitHub:

```
✅ КОММИТИМ:
/figma-ui/                 # Наши UI компоненты
/components/ui/            # shadcn/ui компоненты
/components/dashboard/     # Shared компоненты (KPICard и т.д.)
/styles/                   # Стили
package.json               # Зависимости
tsconfig.json              # TypeScript конфиг
vite.config.ts             # Vite конфиг (если есть)
README.md                  # Документация

❌ НЕ КОММИТИМ:
/node_modules/             # Зависимости (тяжёлые)
/.env                      # Секреты
/dist/                     # Сборка
/build/                    # Сборка
*.log                      # Логи
```

### Создание .gitignore (если ещё нет):

**Файл:** `/.gitignore`

```
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Production
dist/
build/

# Environment
.env
.env.local
.env.production
.env.development

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Editor
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Temporary
*.tmp
*.temp
.cache/
```

---

## 📋 Шаг 4: Настройка Replit для импорта

### В Replit:

1. **Подключение к GitHub:**
   ```bash
   # В Replit Shell:
   git remote add figma-ui https://github.com/ваш-username/ваш-репо.git
   ```

2. **Первый импорт UI:**
   ```bash
   # С��здаём ветку для Figma UI
   git fetch figma-ui main
   
   # Импортируем только папку /figma-ui/
   git checkout figma-ui/main -- figma-ui/
   git checkout figma-ui/main -- components/ui/
   git checkout figma-ui/main -- components/dashboard/KPICard.tsx
   git checkout figma-ui/main -- components/dashboard/StatusLight.tsx
   git checkout figma-ui/main -- components/dashboard/ChartContainer.tsx
   git checkout figma-ui/main -- components/dashboard/ActionItem.tsx
   ```

3. **Настройка автосинхронизации:**
   
   **Создайте файл:** `/sync-figma-ui.sh`
   
   ```bash
   #!/bin/bash
   # Скрипт для синхронизации UI из Figma Make
   
   echo "🔄 Синхронизация Figma UI..."
   
   # Fetch последних изменений
   git fetch figma-ui main
   
   # Импорт только /figma-ui/
   git checkout figma-ui/main -- figma-ui/
   git checkout figma-ui/main -- components/ui/
   git checkout figma-ui/main -- components/dashboard/KPICard.tsx
   git checkout figma-ui/main -- components/dashboard/StatusLight.tsx
   git checkout figma-ui/main -- components/dashboard/ChartContainer.tsx
   git checkout figma-ui/main -- components/dashboard/ActionItem.tsx
   
   echo "✅ Синхронизация завершена!"
   ```
   
   **Запуск:**
   ```bash
   chmod +x sync-figma-ui.sh
   ./sync-figma-ui.sh
   ```

---

## 📋 Шаг 5: Workflow для работы

### В Figma Make (вы + AI):

1. Создаёте новый View компонент в `/figma-ui/`
2. Нажимаете **"Commit to GitHub"**
3. Пишете commit message: `feat: add NewFeature View`
4. Push!

### В Replit (вы):

1. Запускаете синхронизацию:
   ```bash
   ./sync-figma-ui.sh
   ```
   
2. Проверяете что новый View появился:
   ```bash
   ls -la src/figma-ui/components/dashboard/
   ```
   
3. Создаёте Container:
   ```bash
   touch src/containers/dashboard/NewFeatureContainer.tsx
   ```
   
4. Пишете логику в Container
5. Тестируете локально
6. Деплоите на Vercel

---

## 🎯 Альтернатива: GitHub Actions (автоматизация)

### Создайте файл в GitHub: `.github/workflows/sync-to-replit.yml`

```yaml
name: Sync to Replit

on:
  push:
    branches: [main]
    paths:
      - 'figma-ui/**'

jobs:
  notify-replit:
    runs-on: ubuntu-latest
    steps:
      - name: Notify Replit
        run: |
          echo "New Figma UI components pushed to GitHub!"
          # Здесь можно добавить webhook в Replit
```

**Или проще:**
- Replit может автоматически синхронизироваться с GitHub
- Settings → GitHub → Auto-sync

---

## 🔑 Для продвинутых: SSH ключи

### Если нужен SSH доступ (вместо HTTPS):

1. **Генерация SSH ключа:**
   ```bash
   ssh-keygen -t ed25519 -C "your-email@example.com"
   ```

2. **Копирование публичного ключа:**
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```

3. **Добавление в GitHub:**
   - GitHub → Settings → SSH Keys → Add SSH Key
   - Вставьте скопированный ключ

4. **Изменение remote на SSH:**
   ```bash
   git remote set-url origin git@github.com:username/repo.git
   ```

---

## 📊 Проверка подключения

### Тест 1: Figma Make → GitHub

1. Внесите изменение в любой файл
2. Сделайте коммит
3. Проверьте на GitHub что коммит появился

### Тест 2: GitHub → Replit

1. В Replit запустите:
   ```bash
   git fetch figma-ui main
   git log figma-ui/main
   ```
2. Должны увидеть ваш последний коммит

### Тест 3: Полный цикл

1. **Figma Make:**
   - Создайте тестовый файл `/figma-ui/test.txt`
   - Коммит → Push

2. **GitHub:**
   - Проверьте что файл появился

3. **Replit:**
   ```bash
   ./sync-figma-ui.sh
   ls -la src/figma-ui/
   ```
   - Должен появиться `test.txt`

---

## 🆘 Troubleshooting

### Проблема: "Permission denied"
**Решение:** Проверьте права доступа в GitHub или используйте Personal Access Token

### Проблема: "Remote already exists"
**Решение:**
```bash
git remote remove origin
git remote add origin https://github.com/...
```

### Проблема: Файлы не синхронизируются
**Решение:** Проверьте .gitignore - возможно файлы игнорируются

---

## ✅ Checklist готовности

- [ ] GitHub репозиторий создан
- [ ] Figma Make подключен к GitHub
- [ ] Первый коммит сделан
- [ ] Replit импортирует из GitHub
- [ ] Тестовый цикл работает
- [ ] Команда `./sync-figma-ui.sh` работает

---

**Когда всё готово → переходите к ШАГ 3: Тестовый компонент!** 🚀