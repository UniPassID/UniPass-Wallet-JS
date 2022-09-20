export default class MutilTasks {
  private tasks: Array<Promise<any>> = []

  add(task: Promise<any>) {
    this.tasks.push(task)
  }

  run() {
    return Promise.all(this.tasks)
  }
}
