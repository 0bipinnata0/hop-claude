import chalk from 'chalk';

/**
 * 显示标题
 */
export function displayTitle(title: string): void {
  console.log(chalk.bold(`\n${title}\n`));
}

/**
 * 显示成功消息
 */
export function displaySuccess(message: string): void {
  console.log(chalk.green(`✓ ${message}`));
}

/**
 * 显示错误消息
 */
export function displayError(message: string): void {
  console.error(chalk.red(`✗ ${message}`));
}

/**
 * 显示警告消息
 */
export function displayWarning(message: string): void {
  console.log(chalk.yellow(`⚠ ${message}`));
}

/**
 * 显示信息消息
 */
export function displayInfo(label: string, value: string | undefined, defaultText: string = '(default)'): void {
  const displayValue = value || chalk.gray(defaultText);
  console.log(`  ${label}: ${displayValue}`);
}

/**
 * 显示普通消息
 */
export function displayMessage(message: string): void {
  console.log(message);
}
