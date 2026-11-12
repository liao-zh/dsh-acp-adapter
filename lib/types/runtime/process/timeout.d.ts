/**
 * 限时 waitFor：窗口内 settle 则原样传递（值或 rejection）；窗口耗尽 resolve
 * `undefined`。输家 promise 的迟到 rejection 已被 race 订阅观察，不泄漏
 * unhandled（Promise.race 对全部输入立即挂监听）。
 */
export declare function waitWithin<T>(operation: Promise<T>, ms: number): Promise<T | undefined>;
//# sourceMappingURL=timeout.d.ts.map