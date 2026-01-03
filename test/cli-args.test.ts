import { describe, test, expect } from 'bun:test';
import { getClaudeArgs } from '../src/cli';

describe('getClaudeArgs', () => {
  const baseArgv = ['node', 'hop-claude'];

  describe('基础场景', () => {
    test('应该提取 -c 参数', () => {
      const argv = [...baseArgv, '-c'];
      const result = getClaudeArgs(argv);
      expect(result).toEqual(['-c']);
    });

    test('应该提取 -r 及其值', () => {
      const argv = [...baseArgv, '-r', 'test'];
      const result = getClaudeArgs(argv);
      expect(result).toEqual(['-r', 'test']);
    });

    test('应该返回空数组（无参数）', () => {
      const argv = [...baseArgv];
      const result = getClaudeArgs(argv);
      expect(result).toEqual([]);
    });

    test('应该处理多个透传参数', () => {
      const argv = [...baseArgv, '-c', '--verbose'];
      const result = getClaudeArgs(argv);
      expect(result).toEqual(['-c', '--verbose']);
    });
  });

  describe('-- 分隔符', () => {
    test('应该处理 -- 分隔符', () => {
      const argv = [...baseArgv, '--', '-m'];
      const result = getClaudeArgs(argv);
      expect(result).toEqual(['-m']);
    });

    test('应该处理 -- 后的多个参数', () => {
      const argv = [...baseArgv, '--', '-c', '--verbose'];
      const result = getClaudeArgs(argv);
      expect(result).toEqual(['-c', '--verbose']);
    });

    test('-- 后的参数中包含 hop-claude 选项也应该透传', () => {
      const argv = [...baseArgv, '--', '-m', '-l'];
      const result = getClaudeArgs(argv);
      // 这些应该被透传，因为在 -- 之后
      expect(result).toEqual(['-m', '-l']);
    });
  });

  describe('hop-claude 选项过滤', () => {
    test('应该过滤 -m 选项', () => {
      const argv = [...baseArgv, '-m', '-c'];
      const result = getClaudeArgs(argv);
      expect(result).toEqual(['-c']);
    });

    test('应该过滤 -l 选项', () => {
      const argv = [...baseArgv, '-l', '-c'];
      const result = getClaudeArgs(argv);
      expect(result).toEqual(['-c']);
    });

    test('应该过滤 --help 选项', () => {
      const argv = [...baseArgv, '--help', '-c'];
      const result = getClaudeArgs(argv);
      expect(result).toEqual(['-c']);
    });

    test('应该过滤 --version 选项', () => {
      const argv = [...baseArgv, '--version', '-c'];
      const result = getClaudeArgs(argv);
      expect(result).toEqual(['-c']);
    });
  });

  describe('需要值的选项处理', () => {
    test('应该过滤 -e 及其值', () => {
      const argv = [...baseArgv, '-e', 'backup.json', '-c'];
      const result = getClaudeArgs(argv);
      expect(result).toEqual(['-c']);
    });

    test('应该过滤 -i 及其值', () => {
      const argv = [...baseArgv, '-i', 'backup.json', '-c'];
      const result = getClaudeArgs(argv);
      expect(result).toEqual(['-c']);
    });

    test('应该过滤 --export 及其值', () => {
      const argv = [...baseArgv, '--export', 'file.json', '-c'];
      const result = getClaudeArgs(argv);
      expect(result).toEqual(['-c']);
    });

    test('应该过滤 --import 及其值', () => {
      const argv = [...baseArgv, '--import', 'file.json', '-c'];
      const result = getClaudeArgs(argv);
      expect(result).toEqual(['-c']);
    });
  });

  describe('CRITICAL FIX：-s 选项处理', () => {
    test('✅ FIX: -s 不带值时应该保留后面的透传参数', () => {
      const argv = [...baseArgv, '-s', '-c'];
      const result = getClaudeArgs(argv);
      // 修复前会返回 []，修复后应该返回 ['-c']
      expect(result).toEqual(['-c']);
    });

    test('应该过滤 -s 及其值', () => {
      const argv = [...baseArgv, '-s', 'production', '-c'];
      const result = getClaudeArgs(argv);
      expect(result).toEqual(['-c']);
    });

    test('-s 后跟非选项值时应该跳过', () => {
      const argv = [...baseArgv, '-s', 'prod', '-c'];
      const result = getClaudeArgs(argv);
      expect(result).toEqual(['-c']);
    });

    test('-s 后跟选项时不应该跳过', () => {
      const argv = [...baseArgv, '-s', '-c'];
      const result = getClaudeArgs(argv);
      expect(result).toEqual(['-c']);
    });

    test('--switch 不带值时应该保留后面的透传参数', () => {
      const argv = [...baseArgv, '--switch', '-c'];
      const result = getClaudeArgs(argv);
      expect(result).toEqual(['-c']);
    });

    test('--switch 带值时应该跳过值', () => {
      const argv = [...baseArgv, '--switch', 'prod', '-c'];
      const result = getClaudeArgs(argv);
      expect(result).toEqual(['-c']);
    });
  });

  describe('复杂场景', () => {
    test('混合多个 hop-claude 选项和透传参数', () => {
      const argv = [...baseArgv, '-m', '-e', 'file.json', '-c', '--verbose'];
      const result = getClaudeArgs(argv);
      expect(result).toEqual(['-c', '--verbose']);
    });

    test('透传参数中包含值', () => {
      const argv = [...baseArgv, '-r', 'explain this code'];
      const result = getClaudeArgs(argv);
      expect(result).toEqual(['-r', 'explain this code']);
    });

    test('-s 交互式选择 + -m 管理 + -c 透传', () => {
      const argv = [...baseArgv, '-s', '-m', '-c'];
      const result = getClaudeArgs(argv);
      // -s 和 -m 被过滤，-c 被保留
      expect(result).toEqual(['-c']);
    });

    test('多个需要值的选项', () => {
      const argv = [...baseArgv, '-e', 'file1.json', '-i', 'file2.json', '-c'];
      const result = getClaudeArgs(argv);
      expect(result).toEqual(['-c']);
    });

    test('选项后没有值（边缘情况）', () => {
      const argv = [...baseArgv, '-e'];
      const result = getClaudeArgs(argv);
      // -e 后没有值也应该被过滤
      expect(result).toEqual([]);
    });
  });

  describe('真实使用场景', () => {
    test('场景：继续上次对话', () => {
      const argv = [...baseArgv, '-c'];
      const result = getClaudeArgs(argv);
      expect(result).toEqual(['-c']);
    });

    test('场景：用 -r 参数', () => {
      const argv = [...baseArgv, '-r', 'explain the code'];
      const result = getClaudeArgs(argv);
      expect(result).toEqual(['-r', 'explain the code']);
    });

    test('场景：切换配置后继续对话', () => {
      const argv = [...baseArgv, '-s', 'production', '-c'];
      const result = getClaudeArgs(argv);
      expect(result).toEqual(['-c']);
    });

    test('场景：交互式选择配置后继续对话', () => {
      const argv = [...baseArgv, '-s', '-c'];
      const result = getClaudeArgs(argv);
      // 这是修复的关键场景！
      expect(result).toEqual(['-c']);
    });

    test('场景：管理模式后启动', () => {
      const argv = [...baseArgv, '-m', '-c'];
      const result = getClaudeArgs(argv);
      expect(result).toEqual(['-c']);
    });

    test('场景：使用 -- 明确分隔', () => {
      const argv = [...baseArgv, '-s', 'prod', '--', '-m'];
      const result = getClaudeArgs(argv);
      // -- 后的 -m 应该被透传
      expect(result).toEqual(['-m']);
    });
  });
});
