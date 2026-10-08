using System.ComponentModel.DataAnnotations;
using System.Reflection;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Forms;
using Microsoft.AspNetCore.Components.Rendering;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.JSInterop;
using Silmoon.AspNetCore.FullFunctionTemplate.Components;

var contracts = new (string Name, Func<Task> Run)[]
{
    ("TreePicker dynamic Disabled", TreePickerDisabledContract),
    ("EnumSelect dynamic Disabled", EnumSelectDisabledContract),
    ("EnumSelect display metadata and undefined values", EnumSelectDisplayContract),
    ("EnumSelect rendered disposal releases EditContext subscriptions", EnumSelectDisposalContract),
    ("TimeInput end-of-day parsing and formatting", TimeInputEndOfDayContract)
};
var failures = 0;
foreach (var contract in contracts)
{
    try
    {
        await contract.Run();
        Console.WriteLine($"PASS {contract.Name}");
    }
    catch (Exception exception)
    {
        failures++;
        Console.Error.WriteLine($"FAIL {contract.Name}: {exception.GetBaseException()}");
    }
}
Console.WriteLine($"{contracts.Length - failures}/{contracts.Length} component contracts passed.");
return failures == 0 ? 0 : 1;

static async Task TreePickerDisabledContract()
{
    var picker = new TreePicker();
    var callbacks = new List<string>();
    Set(picker, nameof(TreePicker.Value), "/documents/");
    Set(picker, nameof(TreePicker.Folders), new[] { "/documents/", "/reports/" });
    Set(picker, nameof(TreePicker.AllowCreate), true);
    Set(picker, nameof(TreePicker.ValueChanged), EventCallback.Factory.Create<string>(callbacks, (Action<string>)callbacks.Add));
    await InvokeAsync(picker, "OnParametersSetAsync");
    Require(callbacks.Count == 0, "An already normalized initial value must not trigger ValueChanged.");

    Invoke(picker, "TogglePicker");
    Require(Get<bool>(picker, "IsOpen"), "The enabled picker must open.");
    Set(picker, nameof(TreePicker.Disabled), true);
    await InvokeAsync(picker, "OnParametersSetAsync");
    Require(!Get<bool>(picker, "IsOpen"), "Changing Disabled to true must close the open picker.");

    var expandedFolders = Get<HashSet<string>>(picker, "ExpandedFolders").ToHashSet(StringComparer.Ordinal);
    var additionalFolders = Get<HashSet<string>>(picker, "AdditionalFolders").ToHashSet(StringComparer.Ordinal);
    Invoke(picker, "TogglePicker");
    Require(!Get<bool>(picker, "IsOpen"), "A queued toggle must not reopen a disabled picker.");
    Invoke(picker, "ToggleFolder", "/reports/");
    Require(expandedFolders.SetEquals(Get<HashSet<string>>(picker, "ExpandedFolders")), "A disabled picker must not change expanded folders.");
    await InvokeAsync(picker, "SelectFolder", "/reports/");
    Require(picker.Value == "/documents/" && callbacks.Count == 0, "A queued selection must not change the disabled value or invoke ValueChanged.");
    Set(picker, "NewFolderName", "drafts");
    await InvokeAsync(picker, "CreateFolder");
    Require(picker.Value == "/documents/" && callbacks.Count == 0, "A queued create must not change the disabled value or invoke ValueChanged.");
    Require(additionalFolders.SetEquals(Get<HashSet<string>>(picker, "AdditionalFolders")), "A disabled create must not add a folder.");
    Require(expandedFolders.SetEquals(Get<HashSet<string>>(picker, "ExpandedFolders")), "Disabled selection and creation must not change expanded folders.");

    Set(picker, nameof(TreePicker.Disabled), false);
    await InvokeAsync(picker, "OnParametersSetAsync");
    Invoke(picker, "TogglePicker");
    Require(Get<bool>(picker, "IsOpen"), "Re-enabling the picker must allow opening it again.");
    await InvokeAsync(picker, "SelectFolder", "/reports/");
    Require(picker.Value == "/reports/" && callbacks.SequenceEqual(new[] { "/reports/" }), "Re-enabling the picker must restore selection and emit exactly one ValueChanged.");
}

static Task EnumSelectDisabledContract()
{
    var picker = new EnumSelect<SampleMode>();
    Invoke(picker, "TogglePicker");
    Require(Get<bool>(picker, "IsOpen"), "An enabled enum picker must open.");
    Set(picker, nameof(picker.Disabled), true);
    Invoke(picker, "OnParametersSet");
    Require(!Get<bool>(picker, "IsOpen"), "Disabling an open enum picker must close it.");
    Invoke(picker, "TogglePicker");
    Require(!Get<bool>(picker, "IsOpen"), "A queued toggle must not reopen a disabled enum picker.");
    Invoke(picker, "SelectOption", SampleMode.Grid);
    Require(picker.Value == default, "A queued selection must not change a disabled enum value.");
    Set(picker, nameof(picker.Disabled), false);
    Invoke(picker, "OnParametersSet");
    Invoke(picker, "TogglePicker");
    Require(Get<bool>(picker, "IsOpen"), "Re-enabling an enum picker must restore opening.");
    return Task.CompletedTask;
}

static Task EnumSelectDisplayContract()
{
    var componentType = typeof(EnumSelect<SampleMode>);
    Require((string?)InvokeStatic(componentType, "GetDisplayName", SampleMode.List) == "列表", "Declared enum values must use DisplayAttribute.Name.");
    Require((string?)InvokeStatic(componentType, "GetDescription", SampleMode.List) == "按列表展示内容。", "Declared enum values must use DisplayAttribute.Description.");
    Require((string?)InvokeStatic(componentType, "GetDisplayName", SampleMode.Grid) == nameof(SampleMode.Grid), "A declared member without display metadata must retain its name.");
    Require((string?)InvokeStatic(componentType, "GetDescription", SampleMode.Grid) == string.Empty, "A declared member without display metadata must have an empty description.");
    foreach (var value in new[] { default(SampleMode), (SampleMode)42 })
    {
        Require((string?)InvokeStatic(componentType, "GetDisplayName", value) == value.ToString(), "An undefined enum value must display its text without throwing.");
        Require((string?)InvokeStatic(componentType, "GetDescription", value) == string.Empty, "An undefined enum value must have an empty description.");
    }
    return Task.CompletedTask;
}

static Task TimeInputEndOfDayContract()
{
    var input = new TimeInput();
    var endOfDay = TimeSpan.FromDays(1);
    var arguments = new object?[] { "24:00", null, null };
    Require(!(bool)Invoke(input, "TryParseValueFromString", arguments)!, "24:00 must be rejected when AllowEndOfDay is false.");
    Require(!string.IsNullOrEmpty((string?)arguments[2]), "Rejected end-of-day input must provide a validation message.");
    Require(Invoke(input, "FormatValueAsString", endOfDay) is null, "A day boundary must not format as a valid time when AllowEndOfDay is false.");

    arguments = new object?[] { "23:59", null, null };
    Require((bool)Invoke(input, "TryParseValueFromString", arguments)! && (TimeSpan)arguments[1]! == new TimeSpan(23, 59, 0), "23:59 must parse to the corresponding TimeSpan.");
    Require((string?)Invoke(input, "FormatValueAsString", new TimeSpan(9, 5, 0)) == "09:05", "Time values must format as HH:mm.");
    foreach (var partialTime in new[] { "10:3", "1:30" })
    {
        arguments = new object?[] { partialTime, null, null };
        Require(!(bool)Invoke(input, "TryParseValueFromString", arguments)!, "Partial time input must remain invalid until both hour and minute contain two digits.");
    }
    arguments = new object?[] { "10:30", null, null };
    Require((bool)Invoke(input, "TryParseValueFromString", arguments)! && (TimeSpan)arguments[1]! == new TimeSpan(10, 30, 0), "A completed HH:mm value must parse without prematurely normalizing partial input.");

    Set(input, nameof(TimeInput.AllowEndOfDay), true);
    arguments = new object?[] { "24:00", null, null };
    Require((bool)Invoke(input, "TryParseValueFromString", arguments)! && (TimeSpan)arguments[1]! == endOfDay && arguments[2] is null, "AllowEndOfDay must accept 24:00 as exactly one day without a validation error.");
    Require((string?)Invoke(input, "FormatValueAsString", endOfDay) == "24:00", "AllowEndOfDay must format exactly one day as 24:00.");
    arguments = new object?[] { "24:01", null, null };
    Require(!(bool)Invoke(input, "TryParseValueFromString", arguments)!, "AllowEndOfDay must not permit times after 24:00.");
    Set(input, nameof(TimeInput.AllowEndOfDay), false);
    arguments = new object?[] { "24:00", null, null };
    Require(!(bool)Invoke(input, "TryParseValueFromString", arguments)!, "Turning AllowEndOfDay off must restore the normal time range.");
    return Task.CompletedTask;
}

static async Task EnumSelectDisposalContract()
{
    foreach (var mode in new[] { "not-imported", "imported", "disconnected", "js-error" })
    {
        using var services = new ServiceCollection().AddSingleton<IJSRuntime>(new DisposalJsModule(mode)).BuildServiceProvider();
        var context = new EditContext(new EnumDisposalModel());
        EnumSelect<SampleMode>? picker = null;
        var renderer = new HtmlRenderer(services, NullLoggerFactory.Instance);
        await renderer.Dispatcher.InvokeAsync(() => renderer.RenderComponentAsync<EnumDisposalHost>(ParameterView.FromDictionary(new Dictionary<string, object?>
        {
            [nameof(EnumDisposalHost.Context)] = context,
            [nameof(EnumDisposalHost.Capture)] = (Action<EnumSelect<SampleMode>>)(component => picker = component)
        })));
        Require(picker is not null, "The actual enum component must be rendered inside the form context.");
        var validationEvent = typeof(EditContext).GetField("OnValidationStateChanged", BindingFlags.Instance | BindingFlags.NonPublic)
            ?? throw new MissingFieldException(nameof(EditContext), "OnValidationStateChanged");
        bool HasPickerSubscription() => ((Delegate?)validationEvent.GetValue(context))?.GetInvocationList().Any(handler => ReferenceEquals(handler.Target, picker)) == true;
        Require(HasPickerSubscription(), "Rendering the input must establish its real framework validation subscription.");
        var module = new DisposalJsModule(mode);
        if (mode != "not-imported") Set(picker!, "JsModule", module);
        Exception? disposalError = null;
        try { await renderer.DisposeAsync(); }
        catch (Exception exception) { disposalError = exception; }
        Require(!HasPickerSubscription(), $"The {mode} disposal path must release the InputBase validation subscription.");
        Require(mode == "js-error" ? disposalError?.GetBaseException() is JSException : disposalError is null, "Unexpected JS failures must remain visible while disconnected circuits are tolerated.");
        if (mode == "imported") Require(module.DisposeCalls == 1, "The imported JS module must also be disposed exactly once.");
    }
}

static void Require(bool condition, string message)
{
    if (!condition) throw new InvalidOperationException(message);
}

static PropertyInfo Property(object component, string name) => component.GetType().GetProperty(name, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic) ?? throw new MissingMemberException(component.GetType().FullName, name);
static T Get<T>(object component, string name) => (T)Property(component, name).GetValue(component)!;
static void Set(object component, string name, object? value) => Property(component, name).SetValue(component, value);
static object? Invoke(object component, string name, params object?[] arguments) => Method(component.GetType(), name, BindingFlags.Instance).Invoke(component, arguments);
static object? InvokeStatic(Type componentType, string name, params object?[] arguments) => Method(componentType, name, BindingFlags.Static).Invoke(null, arguments);
static MethodInfo Method(Type componentType, string name, BindingFlags scope) => componentType.GetMethod(name, scope | BindingFlags.Public | BindingFlags.NonPublic) ?? throw new MissingMethodException(componentType.FullName, name);
static async Task InvokeAsync(object component, string name, params object?[] arguments)
{
    if (Invoke(component, name, arguments) is Task task) await task;
    else throw new InvalidOperationException($"{component.GetType().Name}.{name} did not return a Task.");
}

enum SampleMode
{
    [Display(Name = "列表", Description = "按列表展示内容。")]
    List = 1,
    Grid = 2
}

sealed class EnumDisposalModel
{
    public SampleMode Mode { get; set; } = SampleMode.List;
}

sealed class EnumDisposalHost : ComponentBase
{
    [Parameter] public EditContext Context { get; set; } = default!;
    [Parameter] public Action<EnumSelect<SampleMode>> Capture { get; set; } = default!;

    protected override void BuildRenderTree(RenderTreeBuilder builder)
    {
        var model = (EnumDisposalModel)Context.Model;
        builder.OpenComponent<CascadingValue<EditContext>>(0);
        builder.AddAttribute(1, "Value", Context);
        builder.AddAttribute(2, "ChildContent", (RenderFragment)(child =>
        {
            child.OpenComponent<EnumSelect<SampleMode>>(0);
            child.AddAttribute(1, "Value", model.Mode);
            child.AddAttribute(2, "ValueExpression", (System.Linq.Expressions.Expression<Func<SampleMode>>)(() => model.Mode));
            child.AddComponentReferenceCapture(3, component => Capture((EnumSelect<SampleMode>)component));
            child.CloseComponent();
        }));
        builder.CloseComponent();
    }
}

sealed class DisposalJsModule(string mode) : IJSRuntime, IJSObjectReference
{
    public int DisposeCalls { get; private set; }
    public ValueTask<TValue> InvokeAsync<TValue>(string identifier, object?[]? args) => InvokeAsync<TValue>(identifier, CancellationToken.None, args);
    public ValueTask<TValue> InvokeAsync<TValue>(string identifier, CancellationToken cancellationToken, object?[]? args)
    {
        if (identifier == "dispose" && mode == "disconnected") throw new JSDisconnectedException("Expected disconnected test circuit.");
        if (identifier == "dispose" && mode == "js-error") throw new JSException("Expected JS disposal failure.");
        return ValueTask.FromResult(default(TValue)!);
    }
    public ValueTask DisposeAsync() { DisposeCalls++; return ValueTask.CompletedTask; }
}
