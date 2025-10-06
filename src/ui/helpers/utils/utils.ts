
export function formatTime(seconds: number) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [hrs, mins, secs]
        .map(v => v < 10 ? "0" + v : v)
        .join(":");
}

export function parseTime(timeStr: string): number {
    const parts = timeStr.split(":").map(Number);
    let seconds = 0;
    for (let i = 0; i < parts.length; i++) {
        seconds += parts[i] * Math.pow(60, parts.length - 1 - i);
    }
    return seconds;
}
export function generateId(): string {
    return 'id-' + Math.random().toString(36).substr(2, 16);
}
export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}
export function reorderArray<T>(list: T[], startIndex: number, endIndex: number): T[] {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
}

export function calculateProgressWidth(completed: number, total: number): string {
    if (total === 0) return '0%';
    const percentage = (completed / total) * 100;
    return `${percentage}%`;
}

export function calculateTotalEstimatedTime(tasks: Task[]): number {
    return tasks.reduce((total, task) => total + task.estimatedTime, 0);
}