interface Task {
  id: string;
  title: string;
  estimatedTime: number;
  actualTime: number;
  description?: string;
  status: TaskStatus;
  isTaskBreak?: boolean;
  subTasks: SubTask[];
}

interface SubTask{
  id: string;
  title: string;
  completed: boolean;
}

interface TaskCart {
  tasks: { [id: string]: Task };
  taskIds: string[];
  taskIdsInCart?: string[];
}