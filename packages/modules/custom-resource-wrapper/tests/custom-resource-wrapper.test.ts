import { customResourceWrapper } from '../src/custom-resource-wrapper'

describe('custom-resource-wrapper', () => {
  it('should call create with the properties', async () => {
    const createHandler = jest.fn().mockReturnValue({ something: 'cool' })
    const updateHandler = jest.fn().mockReturnValue({ something: 'cool' })
    const deleteHandler = jest.fn().mockReturnValue({ something: 'cool' })

    const result = await customResourceWrapper({
      onCreate: createHandler,
      onUpdate: updateHandler,
      onDelete: deleteHandler,
    })({
      RequestType: 'Create',
      LogicalResourceId: '1q23',
      RequestId: '1q23',
      ResourceProperties: {
        ServiceToken: 'asdf',
        property: 'value',
        arrProperty: [],
      },
      ResourceType: 'asdf',
      ResponseURL: 'asdf',
      ServiceToken: 'asdf',
      StackId: 'asdf',
    })

    expect(createHandler).toHaveBeenCalledWith({
      property: 'value',
      arrProperty: [],
      serviceToken: 'asdf',
      requestId: '1q23',
    })
    expect(updateHandler).not.toBeCalled()
    expect(deleteHandler).not.toBeCalled()
    expect(result.Data).toStrictEqual({ something: 'cool' })
  })

  it('should call update with the properties', async () => {
    const createHandler = jest.fn().mockReturnValue({ something: 'cool' })
    const updateHandler = jest.fn().mockReturnValue({ something: 'cool' })
    const deleteHandler = jest.fn().mockReturnValue({ something: 'cool' })

    const result = await customResourceWrapper({
      onCreate: createHandler,
      onUpdate: updateHandler,
      onDelete: deleteHandler,
    })({
      RequestType: 'Update',
      LogicalResourceId: '1q23',
      RequestId: '1q23',
      OldResourceProperties: {
        property: 'old-value',
        arrProperty: [],
      },
      PhysicalResourceId: 'asdf',
      ResourceProperties: {
        ServiceToken: 'asdf',
        property: 'value',
        arrProperty: [],
      },
      ResourceType: 'asdf',
      ResponseURL: 'asdf',
      ServiceToken: 'asdf',
      StackId: 'asdf',
    })

    expect(updateHandler).toHaveBeenCalledWith(
      {
        property: 'value',
        serviceToken: 'asdf',
        arrProperty: [],
        requestId: '1q23',
      },
      {
        property: 'old-value',
        arrProperty: [],
      },
    )
    expect(createHandler).not.toBeCalled()
    expect(deleteHandler).not.toBeCalled()
    expect(result.Data).toStrictEqual({ something: 'cool' })
  })

  it('should call delete with the properties', async () => {
    const createHandler = jest.fn().mockReturnValue({ something: 'cool' })
    const updateHandler = jest.fn().mockReturnValue({ something: 'cool' })
    const deleteHandler = jest.fn().mockReturnValue({ something: 'cool' })

    await customResourceWrapper({
      onCreate: createHandler,
      onUpdate: updateHandler,
      onDelete: deleteHandler,
    })({
      RequestType: 'Delete',
      LogicalResourceId: '1q23',
      RequestId: '1q23',
      PhysicalResourceId: 'asdf',
      ResourceProperties: {
        ServiceToken: 'asdf',
        property: 'value',
        arrProperty: [],
      },
      ResourceType: 'asdf',
      ResponseURL: 'asdf',
      ServiceToken: 'asdf',
      StackId: 'asdf',
    })

    expect(deleteHandler).toHaveBeenCalledWith({
      property: 'value',
      serviceToken: 'asdf',
      arrProperty: [],
      requestId: '1q23',
    })
    expect(createHandler).not.toBeCalled()
    expect(updateHandler).not.toBeCalled()
  })

  it('should catch an error', async () => {
    jest.spyOn(console, 'error').mockImplementation()
    const createHandler = jest.fn().mockRejectedValue(new Error('error message'))
    const result = await customResourceWrapper({
      onCreate: createHandler,
    })({
      RequestType: 'Create',
      LogicalResourceId: '1q23',
      RequestId: '1q23',
      ResourceProperties: {
        ServiceToken: 'asdf',
        property: 'value',
        arrProperty: [],
      },
      ResourceType: 'asdf',
      ResponseURL: 'asdf',
      ServiceToken: 'asdf',
      StackId: 'asdf',
    })
    expect(result.Status).toBe('FAILED')
    expect(result.Reason?.startsWith('[Error] error message:')).toBeTruthy()
    expect(console.error).toHaveBeenCalled()
  })

  it('should return on update if no update handler is set', async () => {
    const createHandler = jest.fn().mockRejectedValue(new Error('error message'))
    const result = await customResourceWrapper({
      onCreate: createHandler,
    })({
      RequestType: 'Update',
      LogicalResourceId: '1q23',
      RequestId: '1q23',
      ResourceProperties: {
        ServiceToken: 'asdf',
        property: 'value',
        arrProperty: [],
      },
      OldResourceProperties: {
        property: 'old-value',
        arrProperty: [],
      },
      PhysicalResourceId: '123',
      ResourceType: 'asdf',
      ResponseURL: 'asdf',
      ServiceToken: 'asdf',
      StackId: 'asdf',
    })
    expect(result.Status).toBe('SUCCESS')
  })
  it('should return on delete if no update handler is set', async () => {
    const createHandler = jest.fn().mockRejectedValue(new Error('error message'))
    const result = await customResourceWrapper({
      onCreate: createHandler,
    })({
      RequestType: 'Delete',
      LogicalResourceId: '1q23',
      RequestId: '1q23',
      ResourceProperties: {
        ServiceToken: 'asdf',
        property: 'value',
        arrProperty: [],
      },
      PhysicalResourceId: '123',
      ResourceType: 'asdf',
      ResponseURL: 'asdf',
      ServiceToken: 'asdf',
      StackId: 'asdf',
    })
    expect(result.Status).toBe('SUCCESS')
  })
})
