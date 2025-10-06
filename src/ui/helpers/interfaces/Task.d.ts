interface Task {
  id: string;
  title: string;
  estimatedTime: number;
  actualTime: number;
  description?: string;
  status: TaskStatus;
  subTasks: SubTask[];
}

interface SubTask{
  id: string;
  title: string;
  completed: boolean;
}