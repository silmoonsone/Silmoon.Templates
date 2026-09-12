using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Silmoon.AspNetCore.Interfaces;

namespace Silmoon.AspNetCore.FullFunctionTemplate.Controllers
{
    public class UserController : Controller
    {
        ISilmoonAuthService SilmoonAuthService { get; set; }
        public UserController(ISilmoonAuthService silmoonAuthService)
        {
            SilmoonAuthService = silmoonAuthService;
        }
        public IActionResult Index()
        {
            return View();
        }
        public async Task<IActionResult> SignIn(string Url, string ReturnUrl)
        {
            var returnUrl = this.Url.IsLocalUrl(ReturnUrl) ? ReturnUrl : this.Url.IsLocalUrl(Url) ? Url : null;
            if (await SilmoonAuthService.IsSignIn()) return LocalRedirect(returnUrl ?? "/");
            return Redirect(returnUrl is null ? "/signin" : QueryHelpers.AddQueryString("/signin", "ReturnUrl", returnUrl));
        }
        public IActionResult SignUp(string ReturnUrl)
        {
            return Redirect(Url.IsLocalUrl(ReturnUrl) ? QueryHelpers.AddQueryString("/signup", "ReturnUrl", ReturnUrl) : "/signup");
        }
        public IActionResult SignUp()
        {
            return View();
        }
    }
}
