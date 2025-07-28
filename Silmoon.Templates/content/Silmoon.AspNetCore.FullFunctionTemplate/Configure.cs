using MongoDB.Bson.Serialization.Serializers;
using MongoDB.Bson.Serialization;
using MongoDB.Bson;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Silmoon.Extension;
using System.ComponentModel;
using System.Numerics;
using System.Reflection;
using Silmoon.Data.MongoDB.Serializer;
using Silmoon.Data.MongoDB.Converters;
using Silmoon.Data.MongoDB.Extensions;

namespace Silmoon.AspNetCore.FullFunctionTemplate;

public class Configure
{
    public static void InitialTypeRegister()
    {
        TypeDescriptor.AddAttributes(typeof(ObjectId), new TypeConverterAttribute(typeof(ObjectIdTypeConverter)));


        // ** Enable Enum type to string convert for MongoDB
        //BsonSerializer.RegisterSerializer(new EnumSerializer<TEnum>(BsonType.String));

        // ** Enable HexBigInteger type support for MongoDB
        //BsonSerializer.RegisterSerializer(typeof(HexBigInteger), new HexBigIntegerConvertSerializer());

        BsonSerializer.RegisterSerializer(new DecimalSerializer(BsonType.Decimal128));
        BsonSerializer.RegisterSerializer(new BigIntegerConvertSerializer());
        BsonSerializer.RegisterSerializer(new JObjectBsonDocumentConvertSerializer());
        BsonSerializer.RegisterSerializer(new JArrayBsonDocumentConvertSerializer());

        // ** Set default MongoDB DateTime to local time
        //BsonSerializer.RegisterSerializer(typeof(DateTime), new DateTimeSerializer(DateTimeKind.Local));

        var objectSerializer = new ObjectSerializer(type => ObjectSerializer.DefaultAllowedTypes(type) || type.FullName.StartsWith(string.Empty));
        BsonSerializer.RegisterSerializer(objectSerializer);

        // ## A class or interface mapping sample
        //BsonClassMap.RegisterClassMap<object>();


        // ## Newtonsoft json type convert for MongoDB
        JsonConvert.DefaultSettings = new Func<JsonSerializerSettings>(() =>
        {
            var settings = new JsonSerializerSettings();
            settings.AddAllCommonConverters();
            settings.AddAllBsonConverters();
            settings.TypeNameHandling = TypeNameHandling.Auto;
            settings.TypeNameAssemblyFormatHandling = TypeNameAssemblyFormatHandling.Simple;
            return settings;
        });
    }
    public static void Output(ILogger logger, string s, LogLevel logLevel = LogLevel.Information)
    {
        logger?.Log(logLevel, s);
        //Net.SocketHelper.UdpSendTo("[" + Configure.ProjectName + "] " + s);
    }
}
