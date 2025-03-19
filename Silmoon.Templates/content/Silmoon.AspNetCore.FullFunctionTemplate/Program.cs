using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Silmoon.AspNetCore.Binders;
using Silmoon.AspNetCore.Extension.Binders;
using Silmoon.AspNetCore.Extensions;
using Silmoon.AspNetCore.FullFunctionTemplate.Services;
using Silmoon.AspNetCore.FullFunctionTemplate;
using System.Reflection;
using Silmoon.AspNetCore.Blazor.Extensions;
using Silmoon.AspNetCore.FullFunctionTemplate.Components;

string ProjectName = Assembly.GetExecutingAssembly().GetName().Name;
Configure.InitialTypeRegister();

var builder = WebApplication.CreateBuilder(args);

// ** Enable Razor pages
builder.Services.AddRazorPages();

// ** Enable Mvc
builder.Services.AddMvc(config =>
{
    config.ModelBinderProviders.Insert(0, new BigIntegerBinderProvider());
    config.ModelBinderProviders.Insert(0, new ObjectIdBinderProvider());
}).AddNewtonsoftJson();

builder.Services.AddHttpContextAccessor();
builder.Services.AddDataProtection().PersistKeysToFileSystem(new DirectoryInfo(Directory.GetCurrentDirectory() + Path.DirectorySeparatorChar + "DataProtection"));
builder.Services.AddSession(o => { o.Cookie.Name = ProjectName + "_" + "Session"; });
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(CookieAuthenticationDefaults.AuthenticationScheme, o =>
{
    o.LoginPath = new PathString("/SignIn");
    o.AccessDeniedPath = new PathString("/access_denied");
    o.Cookie.Name = ProjectName + "_" + "Cookie";
});


// ** Required NuGet package for Swashbuckle.AspNetCore
//builder.Services.AddSwaggerGen(c => c.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory, $"{ProjectName}.xml"), true)).AddSwaggerGenNewtonsoftSupport();

// ** Required NuGet package for Swashbuckle.AspNetCore.Newtonsoft
//builder.Services.AddSwaggerGen().AddSwaggerGenNewtonsoftSupport();

// ** SignalR service mode for ChatServiceHub, require AddSignalR()
//builder.Services.AddSingleton<ChatService>();

// ** SignalR support
//builder.Services.AddSignalR();

// ** Required NuGet package for Microsoft.AspNetCore.SignalR.Protocols.NewtonsoftJson
//builder.Services.AddSignalR().AddNewtonsoftJsonProtocol();

// ** Add Blazor service
//builder.Services.AddRazorComponents().AddInteractiveServerComponents();

builder.Services.AddSingleton<Core>();
builder.Services.AddSilmoonAuth<SilmoonAuthServiceImpl>();

// ** Required NuGet package for Silmoon.AspNetCore.Blazor
//builder.Services.AddJsComponentInterop();
//builder.Services.AddJsSilmoonAuthInterop();

// ** Required NuGet package for Silmoon.AspNetCore.Encryption
//builder.Services.AddWebAuthnJsInterop();
//builder.Services.AddWebAuthn<WebAuthnService>();

//builder.Services.AddSilmoonDevApp<SilmoonDevAppServiceImpl>();

// ## custom a IHostedService for MainHostService
//builder.Services.AddSingleton<MainHostService>();
//builder.Services.AddHostedService(provider => provider.GetRequiredService<MainHostService>());


builder.Services.AddSilmoonConfigure<SilmoonConfigureServiceImpl>(o =>
{
#if DEBUG
    o.DebugConfig();
#else
    o.ReleaseConfig();
#endif
});

builder.Services.Configure<ApiBehaviorOptions>(options => options.SuppressModelStateInvalidFilter = true);

var app = builder.Build();

ILogger logger = app.Services.GetRequiredService<ILogger<Program>>();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseAntiforgery();
app.MapStaticAssets();

//if (app.Environment.IsDevelopment())
//{
//    app.UseSwagger();
//    app.UseSwaggerUI(c => c.DocExpansion(Swashbuckle.AspNetCore.SwaggerUI.DocExpansion.None));
//}

//app.UseApiDecrypt();


app.UseSession();
//app.UseRouting();
app.UseSilmoonAuth();

app.UseAuthentication();
app.UseAuthorization();

// ** Required NuGet package for Silmoon.AspNetCore.Encryption
//app.UseWebAuthn();

// ** Enable razor pages support
app.MapRazorPages();

// ** Enable Mvc
app.UseCors(builder => builder.WithHosts("localhost"));
app.MapControllerRoute(name: "default", pattern: "{controller=Home}/{action=Index}");
app.MapControllerRoute(name: "default", pattern: "{area:exists?}/{controller=Home}/{action=Index}");

// ** Add a SignalR Hub
//app.MapHub<ChatHub>("/hubs/ChatHub");

// ** Use service mode for SignalR Hub
//app.MapHub<ChatServiceHub>("/hubs/ChatServiceHub");

// ** Enable Blazor server components
//app.MapRazorComponents<App>().AddInteractiveServerRenderMode();


Configure.Output(logger, "Server app run.", LogLevel.Information);
app.Run();
Configure.Output(logger, "Server shutdown.", LogLevel.Information);