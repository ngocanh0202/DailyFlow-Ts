# DailyFlow-Ts

## 📖 About

DailyFlow-Ts is a powerful, cross-platform desktop application built with Electron, React, and TypeScript. It helps you organize your daily tasks with intelligent time tracking, ensuring you stay productive and focused throughout your day.

## ✨ Features

- **⏰ Smart Time Tracking** - Automatic duration tracking and time estimation
- **📋 Task Management** - Create, organize, and prioritize tasks effortlessly
- **💾 Local Storage** - Your data stays private on your device

## 🚀 Installation
### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Git

### Download

**Option 1: Download Pre-built Release**

Visit the [Releases](https://github.com/ngocanh0202/dailyflow-ts/releases) page and download the installer for your platform:
- Windows: `.exe` installer
- macOS: `.dmg` or `.app`
- Linux: `.AppImage`, `.deb`, or `.rpm`

**Option 2: Build from Source**

```bash
# Clone the repository
git clone https://github.com/ngocanh0202/DailyFlow-Ts.git

# Navigate to project directory
cd dailyflow-ts

# Install dependencies
npm install
# or
yarn install
# or
pnpm install

# Run in development mode
npm run dev

# Build production
npm run transpile:electron
npm run build
npm run dist:win    # build windows
npm run dist:mac    # build macOS
```

## 💻 Usage

### Quick Start

1. **Create a Task**: Click the "+" button to add a new task
2. **Set Time**: Assign estimated duration and priority
3. **Track Progress**: Start the timer when working on a task
4. **Review Analytics**: Check your productivity stats in the dashboard

### Keyboard Shortcuts

| Action | Shortcut (Win/Linux) | Shortcut (macOS) |
|--------|---------------------|------------------|
| New Task | `Ctrl + N` | `Cmd + N` |
| Toggle Theme | `Ctrl + T` | `Cmd + T` |
| Focus Mode | `Ctrl + Shift + F` | `Cmd + Shift + F` |
| Settings | `Ctrl + ,` | `Cmd + ,` |

## 🛠️ Development

### Tech Stack

- **Frontend**: React, TypeScript
- **Desktop**: Electron
- **Styling**: Tailwind CSS / CSS Modules
- **State Management**: React Context / Redux
- **Build Tool**: Vite

### Project Structure

```
dailyflow-ts/
├──dist-electron        # Compiler from  src/electron
├── src/
│   ├── electron/       # Electron main process and Electron preload scripts
│   ├── ui/             # React app
│   │   ├── components/
│   │   ├── helpers/
│   │   ├── layouts/
│   │   ├── pages/
│   │   └── store/
└── types.d.ts          # Interface Electron preload scripts
```

## 🐛 Bug Reports & Feature Requests

Found a bug or have a feature idea? Please open an issue on our [GitHub Issues](https://github.com/ngocanh0202/DailyFlow-Ts.git/issues) page.


## 👥 Authors

- **Ngoc Anh** - *Initial work* - [@ngocanh0202](https://github.com/ngocanh0202)

## 📧 Contact

- Website: [MyPortfolio](https://ngocanh0202.github.io/MyPortfolio/)
- Email: buihuynhngocanh2020@gmail.com

---

<div align="center">

**⭐ If you find this project helpful, please consider giving it a star!**

Made with ❤️ and TypeScript

</div>
