import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';

const models = [
  {
    id: 'qwen3.7-plus',
    provider: 'dashscope' as const,
    available: true,
    unavailableReason: null
  },
  {
    id: 'deepseek-flash',
    provider: 'openai_compatible' as const,
    available: false,
    unavailableReason: '未配置 DeepSeek API Key，DeepSeek 模型不可选'
  }
];

describe('UserService default model', () => {
  let findUnique: jest.Mock;
  let update: jest.Mock;
  let listSelectableModels: jest.Mock;
  let defaultModelId: jest.Mock;
  let service: UserService;

  beforeEach(() => {
    findUnique = jest.fn();
    update = jest.fn();
    listSelectableModels = jest.fn().mockReturnValue(models);
    defaultModelId = jest.fn().mockReturnValue('qwen3.7-plus');
    service = new UserService(
      { user: { findUnique, update } } as never,
      { listSelectableModels, defaultModelId } as never
    );
  });

  it('未设置个人默认时返回 null，生效值为系统默认', async () => {
    findUnique.mockResolvedValue({ defaultModelId: null });

    await expect(service.getDefaultModel('user-1')).resolves.toEqual({
      defaultModelId: null,
      effectiveModelId: 'qwen3.7-plus'
    });
  });

  it('已保存但当前不可用时保留已保存值，生效值回退到系统默认', async () => {
    findUnique.mockResolvedValue({ defaultModelId: 'deepseek-flash' });

    await expect(service.getDefaultModel('user-1')).resolves.toEqual({
      defaultModelId: 'deepseek-flash',
      effectiveModelId: 'qwen3.7-plus'
    });
  });

  it('用户不存在时 GET 抛出 NotFoundException', async () => {
    findUnique.mockResolvedValue(null);
    await expect(service.getDefaultModel('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('保存当前可用模型并返回已保存值与生效值', async () => {
    findUnique.mockResolvedValueOnce({ id: 'user-1' }).mockResolvedValueOnce({ defaultModelId: 'qwen3.7-plus' });
    update.mockResolvedValue({});

    await expect(service.setDefaultModel('user-1', '  qwen3.7-plus  ')).resolves.toEqual({
      defaultModelId: 'qwen3.7-plus',
      effectiveModelId: 'qwen3.7-plus'
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { defaultModelId: 'qwen3.7-plus' }
    });
  });

  it('拒绝保存不在当前部署列表中的模型', async () => {
    await expect(service.setDefaultModel('user-1', 'unknown-model')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.setDefaultModel('user-1', 'unknown-model')).rejects.toThrow(
      '该模型不在当前部署的可选列表中，不能设为默认'
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('拒绝保存当前不可用的模型，并返回不可用原因', async () => {
    await expect(service.setDefaultModel('user-1', 'deepseek-flash')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.setDefaultModel('user-1', 'deepseek-flash')).rejects.toThrow(
      '未配置 DeepSeek API Key，DeepSeek 模型不可选'
    );
    expect(update).not.toHaveBeenCalled();
  });
});
