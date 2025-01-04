using MongoDB.Driver;
using Newtonsoft.Json.Linq;
using Silmoon.AspNetCore.FullFunctionTemplate.Models;
using Silmoon.AspNetCore.FullFunctionTemplate.Services;
using Silmoon.AspNetCore.Services.Interfaces;
using Silmoon.Data.MongoDB;
using Silmoon.Extension;
using Silmoon.Models;
using Silmoon.Secure;
using System.Linq.Expressions;
using System.Text.RegularExpressions;

namespace Silmoon.AspNetCore.FullFunctionTemplate;

public class Core : MongoService, IDisposable
{
    public override MongoExecuter Executer { get; set; }
    public SilmoonConfigureServiceImpl SilmoonConfigureService { get; set; }

    public Core(ISilmoonConfigureService silmoonConfigureService)
    {
        SilmoonConfigureService = (SilmoonConfigureServiceImpl)silmoonConfigureService;
        Executer = new MongoExecuter(SilmoonConfigureService.MongoDBConnectionString);
    }
    public User GetUser(string Username)
    {
        if (Username.IsNullOrEmpty()) return null;
        return new User()
        {
            Username = Username,
            Password = "123".GetMD5Hash(),
        };
    }
    public StateSet<bool> NewUser(User user)
    {
        if (user.Username.IsNullOrEmpty() || user.Password.IsNullOrEmpty()) return false.ToStateSet("Username or Password is empty.");
        return true.ToStateSet(user.Username);
    }

    public void Dispose()
    {
        Executer = null;
    }

}
